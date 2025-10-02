import psycopg2
from typing import Dict, List, Tuple, Optional
import hashlib
import re

class ProductMatcherOptimized:
    """
    Product matcher that prioritizes product_code + supplier_id.
    Order of resolution:
      1) Exact (org_id, supplier_id, product_code)
      2) Exact (org_id, product_code)  # supplier mismatch tolerance
      3) Fuzzy by description within same supplier
      4) Fuzzy by description within org
    """

    def __init__(self, cur):
        self.cur = cur
        self._product_cache: Dict[str, str] = {}  # hash -> product_id
        self._supplier_cache: Dict[str, str] = {}  # supplier_id -> name
        self._batch_size = 100

    def _norm_code(self, code: Optional[str]) -> str:
        """Normalize product codes while preserving important separators."""
        if not code:
            return ""
        
        # Keep alphanumeric, hyphens, and spaces, but normalize whitespace
        normalized = re.sub(r'[^\w\s-]', '', str(code).strip())
        # Normalize whitespace and convert to uppercase
        normalized = ' '.join(normalized.split()).upper()
        
        # Remove leading zeros only if the entire code is numeric
        if normalized.replace('-', '').replace(' ', '').isdigit():
            normalized = re.sub(r'\b0+(\d)', r'\1', normalized)
        
        return normalized

    def _get_cache_key(self, product_name: str, product_code: str, org_id: str, supplier_id: Optional[str]) -> str:
        """Cache key includes supplier to avoid cross-supplier collisions."""
        key_data = f"{org_id}:{supplier_id or ''}:{self._norm_code(product_code)}:{(product_name or '').lower().strip()}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def _load_supplier_cache(self, supplier_ids: List[str]):
        """Load supplier names into cache for performance."""
        if not supplier_ids:
            return
        
        # Filter out already cached suppliers
        uncached_ids = [sid for sid in supplier_ids if sid not in self._supplier_cache]
        if not uncached_ids:
            return
            
        try:
            placeholders = ",".join(["%s"] * len(uncached_ids))
            self.cur.execute(
                f"""
                SELECT supplier_id, name
                FROM suppliers
                WHERE supplier_id IN ({placeholders})
                """,
                uncached_ids,
            )
            for supplier_id, name in self.cur.fetchall():
                self._supplier_cache[supplier_id] = name
        except psycopg2.Error as e:
            print(f"Warning: Error loading supplier cache: {e}")
            # Continue without caching - not critical for functionality

    def _batch_resolve_products(self, products: List[dict], org_id: str) -> Dict[str, Tuple[Optional[str], bool]]:
        results: Dict[str, Tuple[Optional[str], bool]] = {}

        exact_code_products: List[Tuple[str, dict]] = []
        fuzzy_products: List[Tuple[str, dict]] = []

        for p in products:
            cache_key = self._get_cache_key(p.get("name", ""), p.get("code", ""), org_id, p.get("supplier_id"))
            if cache_key in self._product_cache:
                results[cache_key] = (self._product_cache[cache_key], False)
                continue

            if p.get("code"):
                exact_code_products.append((cache_key, p))
            else:
                fuzzy_products.append((cache_key, p))

        if exact_code_products:
            self._batch_resolve_exact_codes(exact_code_products, org_id, results)

        # Remaining unmatched go to fuzzy
        remaining = [(k, p) for (k, p) in fuzzy_products + exact_code_products if k not in results]
        if remaining:
            self._batch_resolve_fuzzy(remaining, org_id, results)

        return results

    def _batch_resolve_exact_codes(
        self,
        products: List[Tuple[str, dict]],
        org_id: str,
        results: Dict[str, Tuple[Optional[str], bool]],
    ):
        """Resolve products by exact code matching with supplier priority."""
        try:
            # Build VALUES table (idx, code_norm, supplier_id)
            tuples = []
            for i, (cache_key, p) in enumerate(products):
                tuples.append((i, self._norm_code(p.get("code")), p.get("supplier_id")))

            # Early exit if no codes
            if not any(t[1] for t in tuples):
                return

            # 1) Exact on (org_id, supplier_id, product_code) - PRIMARY MATCH
            values_clause = ",".join(["(%s,%s,%s)"] * len(tuples))
            flat = []
            for t in tuples:
                flat.extend(t)

            self.cur.execute(
                f"""
                WITH inputs(idx, code_norm, supplier_id) AS (
                    VALUES {values_clause}
                )
                SELECT i.idx, p.product_id
                FROM inputs i
                JOIN products p
                  ON p.organization_id = %s
                 AND p.active = TRUE
                 AND p.product_code = i.code_norm
                 AND p.supplier_id = i.supplier_id
                """,
                flat + [org_id],
            )
            hard_hits = dict(self.cur.fetchall() or [])

            # Fill results for hard matches
            for i, (cache_key, p) in enumerate(products):
                if i in hard_hits:
                    pid = hard_hits[i]
                    results[cache_key] = (pid, False)
                    self._product_cache[cache_key] = pid

            # 2) Fallback: exact (org_id, product_code) regardless of supplier (only for still-unmatched)
            remain = [(i, cache_key, p) for i, (cache_key, p) in enumerate(products) if cache_key not in results]
            if not remain:
                return

            values_clause2 = ",".join(["(%s,%s)"] * len(remain))
            flat2 = []
            for i, cache_key, p in remain:
                flat2.extend([i, self._norm_code(p.get("code"))])

            self.cur.execute(
                f"""
                WITH inputs(idx, code_norm) AS (
                    VALUES {values_clause2}
                )
                SELECT i.idx, p.product_id
                FROM inputs i
                JOIN products p
                  ON p.organization_id = %s
                 AND p.active = TRUE
                 AND p.product_code = i.code_norm
                """,
                flat2 + [org_id],
            )
            soft_hits = dict(self.cur.fetchall() or [])
            for i, cache_key, p in remain:
                if i in soft_hits:
                    pid = soft_hits[i]
                    results[cache_key] = (pid, False)
                    self._product_cache[cache_key] = pid
                    
        except psycopg2.Error as e:
            print(f"Error in batch resolve exact codes: {e}")
            # Fallback: mark all as pending for manual review
            for cache_key, p in products:
                if cache_key not in results:
                    results[cache_key] = (None, True)

    def _batch_resolve_fuzzy(
        self,
        products: List[Tuple[str, dict]],
        org_id: str,
        results: Dict[str, Tuple[Optional[str], bool]],
        supplier_first_threshold: float = 0.78,
        org_threshold: float = 0.82,
    ):
        """
        Fuzzy by description using pg_trgm, but:
          - Try within same supplier first (lower threshold).
          - If no hit, widen to org with a slightly higher threshold.
        """
        try:
            # inputs
            names = [(i, (p.get("name") or "").strip()) for i, (ck, p) in enumerate(products)]
            if not any(n for _, n in names):
                for ck, _ in products:
                    results[ck] = (None, True)
                return

            idx_to_cache = {i: ck for i, (ck, _) in enumerate(products)}
            idx_to_supplier = {i: p.get("supplier_id") for i, (_, p) in enumerate(products)}

            # Same-supplier fuzzy
            # Note: requires pg_trgm and index on lower(description)
            values_clause = ",".join(["(%s,%s,%s)"] * len(names))
            flat = []
            for i, name in names:
                flat.extend([i, name.lower(), idx_to_supplier[i]])

            self.cur.execute(
                f"""
                WITH inputs(idx, search_name, supplier_id) AS (VALUES {values_clause}),
                cte AS (
                  SELECT i.idx, p.product_id,
                         similarity(lower(p.description), i.search_name) AS sim
                  FROM inputs i
                  JOIN products p
                    ON p.organization_id = %s
                   AND p.active = TRUE
                   AND p.supplier_id = i.supplier_id
                  WHERE similarity(lower(p.description), i.search_name) >= %s
                ),
                ranked AS (
                  SELECT DISTINCT ON (idx) idx, product_id, sim
                  FROM cte
                  ORDER BY idx, sim DESC
                )
                SELECT idx, product_id, sim FROM ranked
                """,
                flat + [org_id, supplier_first_threshold],
            )
            s_hits = {r[0]: (r[1], r[2]) for r in self.cur.fetchall() or []}

            # Assign supplier-limited hits
            for i, (cache_key, p) in enumerate(products):
                if i in s_hits:
                    pid, _ = s_hits[i]
                    results[cache_key] = (pid, False)
                    self._product_cache[cache_key] = pid

            # Org-wide fuzzy for still-unmatched
            remain = [(i, (cache_key, p)) for i, (cache_key, p) in enumerate(products) if cache_key not in results]
            if not remain:
                return

            values_clause2 = ",".join(["(%s,%s)"] * len(remain))
            flat2 = []
            for i, (cache_key, p) in remain:
                flat2.extend([i, (p.get("name") or "").lower().strip()])

            self.cur.execute(
                f"""
                WITH inputs(idx, search_name) AS (VALUES {values_clause2}),
                cte AS (
                  SELECT i.idx, p.product_id,
                         similarity(lower(p.description), i.search_name) AS sim
                  FROM inputs i
                  JOIN products p
                    ON p.organization_id = %s
                   AND p.active = TRUE
                  WHERE similarity(lower(p.description), i.search_name) >= %s
                ),
                ranked AS (
                  SELECT DISTINCT ON (idx) idx, product_id, sim
                  ORDER BY idx, sim DESC
                  FROM cte
                )
                SELECT idx, product_id, sim FROM ranked
                """,
                flat2 + [org_id, org_threshold],
            )
            o_hits = {r[0]: (r[1], r[2]) for r in self.cur.fetchall() or []}

            for i, (cache_key, p) in remain:
                if i in o_hits:
                    pid, _ = o_hits[i]
                    results[cache_key] = (pid, False)
                    self._product_cache[cache_key] = pid
                else:
                    results[cache_key] = (None, True)
                    
        except psycopg2.Error as e:
            print(f"Error in batch resolve fuzzy: {e}")
            # Fallback: mark all as pending for manual review
            for cache_key, p in products:
                if cache_key not in results:
                    results[cache_key] = (None, True)

    def resolve_products_batch(self, products: List[dict], org_id: str) -> List[Tuple[Optional[str], bool]]:
        supplier_ids = list(set(p.get("supplier_id") for p in products if p.get("supplier_id")))
        self._load_supplier_cache(supplier_ids)
        results = self._batch_resolve_products(products, org_id)
        out: List[Tuple[Optional[str], bool]] = []
        for p in products:
            ck = self._get_cache_key(p.get("name", ""), p.get("code", ""), org_id, p.get("supplier_id"))
            out.append(results.get(ck, (None, True)))
        return out


def resolve_product_optimized(cur, product_name, product_code, supplier_id, org_id):
    matcher = ProductMatcherOptimized(cur)
    return matcher.resolve_products_batch(
        [{"name": product_name, "code": product_code, "supplier_id": supplier_id}],
        org_id,
    )[0]
