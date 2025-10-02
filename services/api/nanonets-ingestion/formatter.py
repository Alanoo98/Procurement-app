
def beautify_nanonets_response(response: dict) -> str:
    output_lines = []
    message = response.get("message", "No message found")
    output_lines.append(f"\n🔔 Overall status: {message}")

    for item in response.get("result", []):
        input_file = item.get("input", "Unknown file")
        output_lines.append(f"\n📄 File: {input_file}")
        predictions = item.get("prediction", [])
        for pred in predictions:
            label = pred.get("label", "N/A")
            text = pred.get("ocr_text", pred.get("text", ""))
            score = pred.get("score", 0)
            status = pred.get("status", "N/A")
            output_lines.append(f"  - {label}: \"{text}\" (Score: {score:.4f}, Status: {status})")

        # Add table content if present
        tables = [p for p in predictions if p.get("type") == "table"]
        for table in tables:
            cells = table.get("cells", [])
            if cells:
                output_lines.append("\n📊 Table Data:")
                # Sort cells by row/col
                cells.sort(key=lambda c: (c.get("row", 0), c.get("col", 0)))
                current_row = -1
                row_data = []
                for cell in cells:
                    row = cell.get("row")
                    if row != current_row and row_data:
                        output_lines.append("    | " + " | ".join(row_data) + " |")
                        row_data = []
                        current_row = row
                    cell_text = cell.get("text", "")
                    row_data.append(cell_text.strip())
                if row_data:
                    output_lines.append("    | " + " | ".join(row_data) + " |")

    return "\n".join(output_lines)
