import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useLocations } from '@/hooks/data';
import { PaxRecord } from '@/hooks/data';
import { toast } from 'sonner';

interface AddPaxFormProps {
  onAdd: (record: Omit<PaxRecord, 'pax_id' | 'created_at' | 'updated_at'>) => Promise<any>;
}

export const AddPaxForm: React.FC<AddPaxFormProps> = ({ onAdd }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [locationId, setLocationId] = useState<string>('');
  const [paxCount, setPaxCount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: locations, isLoading: locationsLoading } = useLocations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !locationId || !paxCount) {
      toast.error('Please fill in all fields');
      return;
    }

    const paxValue = parseInt(paxCount);
    if (isNaN(paxValue) || paxValue < 0) {
      toast.error('PAX count must be a positive number');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onAdd({
        date_id: date,
        location_id: locationId,
        pax_count: paxValue
      });
      
      // Reset form
      setPaxCount('');
      toast.success('PAX record added successfully');
    } catch (error) {
      console.error('Error adding PAX record:', error);
      // Don't show toast here as the parent component will handle errors
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Add New PAX Record</h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            required
            disabled={locationsLoading}
          >
            <option value="">Select a location</option>
            {locations?.map(location => (
              <option key={location.location_id} value={location.location_id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PAX Count
          </label>
          <input
            type="number"
            value={paxCount}
            onChange={(e) => setPaxCount(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            placeholder="Enter number of guests"
            min="0"
            required
          />
        </div>
        
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isSubmitting || !date || !locationId || !paxCount}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-5 w-5" />
            Add Record
          </button>
        </div>
      </form>
    </div>
  );
};

