import * as React from "react";
import { useState, useEffect } from "react";
import { LayoutDashboard, Microscope, History, Settings, Bell, MapPin, LogIn, LogOut, Loader2, ShieldCheck } from "lucide-react";
import DiagnosticTool from "@/src/components/DiagnosticTool";
import HistoryView from "@/src/components/HistoryView";
import SettingsView from "@/src/components/SettingsView";
import { AuthProvider, useAuth } from "@/src/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { auth, googleProvider, signInWithPopup, db, collection, query, where, onSnapshot } from "./firebase";
import { DiagnosisRecord } from "./types";

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("diagnose");
  const [selectedRecord, setSelectedRecord] = useState<DiagnosisRecord | null>(null);
  const [records, setRecords] = useState<DiagnosisRecord[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "diagnoses"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DiagnosisRecord[];
      setRecords(data);
    });

    return () => unsubscribe();
  }, [user]);

  const regionalDiagnoses = profile?.location 
    ? records.filter(r => r.location === profile.location)
    : records;

  const regionalCreditScore = profile?.location
    ? regionalDiagnoses.reduce((acc, r) => acc + (r.credit_metadata?.compliance_weight || 0), 500)
    : profile?.creditScore || 500;

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => auth.signOut();

  if (loading) {
    return (
      <div className="min-h-screen bg-agri-cream flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-agri-green animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-agri-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card p-8 rounded-3xl text-center space-y-6">
          <div className="w-20 h-20 bg-agri-green rounded-2xl flex items-center justify-center mx-auto shadow-xl">
            <Microscope className="text-white w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-serif text-agri-green font-bold">Agri-Synq Core</h1>
            <p className="text-slate-500">Precision Agronomy & Financial Inclusion for West African Smallholders</p>
          </div>
          <Button 
            onClick={handleLogin}
            className="w-full bg-agri-green hover:bg-agri-green/90 text-white h-14 text-lg rounded-2xl shadow-lg"
          >
            <LogIn className="mr-2 w-6 h-6" />
            Sign in with Google
          </Button>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Secure Synq Protocol v1.0</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-agri-cream flex flex-col md:flex-row">
      {/* Sidebar - Mobile Bottom Nav / Desktop Sidebar */}
      <aside className="fixed bottom-0 left-0 right-0 md:relative md:w-64 bg-agri-green text-white z-50 md:h-screen flex md:flex-col shadow-2xl">
        <div className="hidden md:flex p-6 items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Microscope className="text-agri-green w-6 h-6" />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight">Agri-Synq</h1>
        </div>

        <nav className="flex md:flex-col flex-1 justify-around md:justify-start p-2 md:p-4 md:space-y-2">
          <NavItem 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
            active={activeTab === "dash"} 
            onClick={() => { setActiveTab("dash"); setSelectedRecord(null); }} 
          />
          <NavItem 
            icon={<Microscope />} 
            label="Diagnose" 
            active={activeTab === "diagnose"} 
            onClick={() => { setActiveTab("diagnose"); setSelectedRecord(null); }} 
          />
          <NavItem 
            icon={<History />} 
            label="Synq History" 
            active={activeTab === "history"} 
            onClick={() => { setActiveTab("history"); setSelectedRecord(null); }} 
          />
          <NavItem 
            icon={<Settings />} 
            label="Settings" 
            active={activeTab === "settings"} 
            onClick={() => { setActiveTab("settings"); setSelectedRecord(null); }} 
          />
        </nav>

        <div className="hidden md:block p-4 mt-auto border-t border-white/10">
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3 p-2 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-agri-gold rounded-full flex items-center justify-center text-xs font-bold">
                {user.displayName?.[0] || "U"}
              </div>
              <div>
                <p className="text-sm font-bold truncate w-24">{user.displayName}</p>
                <p className="text-[10px] opacity-60 uppercase">Smallholder Pro</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/50 hover:text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-0 overflow-y-auto h-screen">
        {/* Header */}
        <header className="sticky top-0 bg-agri-cream/80 backdrop-blur-md z-40 p-4 md:p-6 flex items-center justify-between border-b border-agri-green/5">
          <div className="flex items-center gap-2">
            <MapPin className="text-agri-clay w-4 h-4" />
            <span className="text-sm font-medium text-slate-600">{profile?.location || "Location not set"}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-agri-clay rounded-full border-2 border-agri-cream" />
            </Button>
            <Badge variant="outline" className="hidden md:flex border-agri-green text-agri-green font-mono">
              CREDIT: {profile?.creditScore || 500}
            </Badge>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {activeTab === "diagnose" && (
            <DiagnosticTool initialData={selectedRecord} onClear={() => setSelectedRecord(null)} />
          )}
          {activeTab === "history" && (
            <HistoryView onSelect={(record) => { setSelectedRecord(record); setActiveTab("diagnose"); }} />
          )}
          {activeTab === "settings" && <SettingsView />}
          {activeTab === "dash" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="glass-card border-none earthy-gradient text-white">
                <CardContent className="p-6 space-y-2">
                  <p className="text-xs uppercase font-bold tracking-widest opacity-80">Regional Credit Score</p>
                  <h3 className="text-4xl font-mono font-bold">{regionalCreditScore}</h3>
                  <p className="text-sm opacity-80">Zonal Ranking: {profile?.location?.split(',')[0] || "Global"}</p>
                </CardContent>
              </Card>
              <Card className="glass-card border-none">
                <CardContent className="p-6 space-y-2">
                  <p className="text-xs uppercase font-bold tracking-widest text-slate-400">Regional Diagnoses</p>
                  <h3 className="text-4xl font-mono font-bold text-agri-green">{regionalDiagnoses.length}</h3>
                  <p className="text-sm text-slate-500">Total Global: {records.length}</p>
                </CardContent>
              </Card>
              <Card className="glass-card border-none">
                <CardContent className="p-6 space-y-2">
                  <p className="text-xs uppercase font-bold tracking-widest text-slate-400">Preferred Dialect</p>
                  <h3 className="text-4xl font-serif font-bold text-agri-gold">{profile?.preferredDialect}</h3>
                  <p className="text-sm text-slate-500">Localized Voice Engine Active</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2 md:p-3 rounded-xl transition-all ${
        active 
          ? "bg-white text-agri-green shadow-lg" 
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="w-6 h-6">{icon}</span>
      <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
