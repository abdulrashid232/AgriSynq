import React, { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Languages, MapPin, CreditCard, ShieldCheck } from "lucide-react";

export default function SettingsView() {
  const { profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const dialects = ["Twi", "Ga", "Ewe", "Yoruba", "Hausa", "Fante"];

  const handleDialectChange = async (dialect: string) => {
    setSaving(true);
    try {
      await updateProfile({ preferredDialect: dialect as any });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-serif text-agri-green">Account Settings</h2>
      
      <Card className="glass-card border-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Languages className="text-agri-green w-6 h-6" />
            <div>
              <CardTitle>Language & Localization</CardTitle>
              <CardDescription>Choose your preferred dialect for voice scripts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {dialects.map((d) => (
              <Button
                key={d}
                variant={profile.preferredDialect === d ? "default" : "outline"}
                className={profile.preferredDialect === d ? "bg-agri-green" : "border-agri-green text-agri-green"}
                onClick={() => handleDialectChange(d)}
                disabled={saving}
              >
                {d}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="text-agri-green w-6 h-6" />
            <div>
              <CardTitle>Synq Credit Profile</CardTitle>
              <CardDescription>Your financial inclusion status</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-agri-green/5 rounded-xl">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Current Score</p>
              <p className="text-3xl font-mono font-bold text-agri-green">{profile.creditScore || 500}</p>
            </div>
            <Badge className="bg-agri-gold text-white">Smallholder Pro</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <ShieldCheck className="w-4 h-4 text-agri-green" />
            <span>Your score is built through verified agronomic compliance.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
