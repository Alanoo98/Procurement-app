import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from 'lucide-react';
import emailjs from '@emailjs/browser';

interface AccessRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccessRequestForm = ({ open, onOpenChange }: AccessRequestFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    locations: '',
    phone: '',
    message: ''
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey) {
        throw new Error("EmailJS environment variables are not set");
      }

      const templateParams = {
        to_email: 'vergara.projects.e@gmail.com',
        from_name: formData.name,
        from_email: formData.email,
        company_name: formData.companyName,
        locations: formData.locations,
        phone: formData.phone,
        message: formData.message,
        subject: `Procurement Access Request - ${formData.companyName}`,
        time: new Date().toLocaleString('en-US'),
      };

      await emailjs.send(serviceId, templateId, templateParams, publicKey);

      toast({
        title: "Request Sent!",
        description: "Your access request has been submitted. We'll contact you as soon as possible.",
      });

      setFormData({
        name: '',
        email: '',
        companyName: '',
        locations: '',
        phone: '',
        message: ''
      });

      onOpenChange(false);

    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Submission Error",
        description: "There was an error sending your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Request Access
          </DialogTitle>
          <DialogDescription>
            Fill out the form below and we'll contact you as soon as possible.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="companyName">Company Name *</Label>
            <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleInputChange} required className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="locations">Number of Locations</Label>
              <Input id="locations" name="locations" value={formData.locations} onChange={handleInputChange} placeholder="e.g. 3" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea id="message" name="message" value={formData.message} onChange={handleInputChange} placeholder="Tell us briefly about your procurement needs..." className="mt-1" rows={3} />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This form requires EmailJS keys to be set up in your .env environment.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-procurement-primary-600 hover:bg-procurement-primary-700">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
