import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SettingsPage({ hospitalData }: { hospitalData: any }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    bed_count: 0,
  });

  useEffect(() => {
    if (hospitalData) {
      setFormData({
        name: hospitalData.name || '',
        address: hospitalData.address || '',
        phone: hospitalData.phone || '',
        email: hospitalData.contact_email || '',
        website: hospitalData.website || '',
        bed_count: hospitalData.bed_count || 0,
      });
    }
  }, [hospitalData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('hospitals')
        .update({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          contact_email: formData.email,
          website: formData.website,
          bed_count: formData.bed_count,
        })
        .eq('id', hospitalData.id);

      if (error) throw error;
      toast.success('Settings updated successfully');
    } catch (error: any) {
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Hospital Settings</h2>
        <p className="text-muted-foreground">Manage hospital configuration and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hospital Information</CardTitle>
          <CardDescription>Update your hospital details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Hospital Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bed_count">Total Beds</Label>
                <Input
                  id="bed_count"
                  type="number"
                  value={formData.bed_count}
                  onChange={(e) => setFormData({ ...formData, bed_count: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
