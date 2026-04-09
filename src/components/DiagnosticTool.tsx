import React, { useState, useRef } from "react";
import { Camera, Upload, Send, Leaf, AlertTriangle, CheckCircle2, Loader2, Languages, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { diagnoseCrop, generateSpeech } from "@/src/services/gemini";
import { AgriSynqResponse, DiagnosisRecord } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { db, collection, addDoc, Timestamp, handleFirestoreError, OperationType } from "../firebase";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";

export default function DiagnosticTool({ initialData, onClear }: { initialData?: DiagnosisRecord | null, onClear?: () => void }) {
  const { user, profile, updateProfile } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgriSynqResponse | null>(initialData || null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If initialData is provided, we are in "view mode"
  const isViewMode = !!initialData;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewMode) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDiagnose = async () => {
    if (!image && !description) return;
    setLoading(true);
    setError(null);
    try {
      const data = await diagnoseCrop(image || undefined, description, profile?.preferredDialect || "Twi");
      setResult(data);
      
      // Persist to Firestore
      if (user) {
        const record: Omit<DiagnosisRecord, 'id'> = {
          ...data,
          userId: user.uid,
          timestamp: Timestamp.now(),
          imageUrl: image || null,
          description: description || null,
          location: profile?.location || null,
        };
        await addDoc(collection(db, "diagnoses"), record);

        // Update Credit Score
        const newScore = (profile?.creditScore || 500) + data.credit_metadata.compliance_weight;
        await updateProfile({ creditScore: newScore });
      }
    } catch (err: any) {
      console.error("Diagnosis failed:", err);
      let msg = "Diagnosis failed. Please try again.";
      
      // Check for 503
      if (err.message && err.message.includes("503")) {
        msg = "The AI engine is currently busy due to high demand. Please wait a few seconds and try again.";
      } else if (err.message && err.message.includes("permission")) {
        msg = "Security check failed. Please ensure you are logged in.";
      }
      
      setError(msg);
      // We don't call handleFirestoreError here if it's a Gemini error to avoid crashing the whole view
      if (!err.message.includes("503")) {
        try {
          handleFirestoreError(err, OperationType.WRITE, "diagnoses");
        } catch (e) {
          // Error already logged
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (text: string) => {
    if (isPlaying) {
      // Stop current playback
      setIsPlaying(false);
      return;
    }

    setAudioLoading(true);
    try {
      const base64 = await generateSpeech(text);
      if (base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const arrayBuffer = bytes.buffer;
        const audioBuffer = audioContext.createBuffer(1, arrayBuffer.byteLength / 2, 24000);
        const nowBuffering = audioBuffer.getChannelData(0);
        const dataView = new DataView(arrayBuffer);
        
        for (let i = 0; i < arrayBuffer.byteLength / 2; i++) {
          nowBuffering[i] = dataView.getInt16(i * 2, true) / 32768;
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        setIsPlaying(true);
        source.onended = () => setIsPlaying(false);
        source.start();
      }
    } catch (error) {
      console.error("Audio playback failed:", error);
    } finally {
      setAudioLoading(false);
    }
  };

  const clear = () => {
    setImage(null);
    setDescription("");
    setResult(null);
    setError(null);
    setAudioUrl(null);
    setIsPlaying(false);
    if (onClear) onClear();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card className="glass-card overflow-hidden border-none">
        <div className="h-2 earthy-gradient w-full" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-serif text-agri-green">
                {isViewMode ? "Diagnosis Record" : "Field Diagnostic"}
              </CardTitle>
              <CardDescription>
                {isViewMode ? "Historical record from Synq network" : "Upload a photo or describe your crop issue"}
              </CardDescription>
            </div>
            {isViewMode ? (
              <Button variant="ghost" size="icon" onClick={clear}>
                <X className="w-6 h-6 text-slate-400" />
              </Button>
            ) : (
              <Leaf className="text-agri-green w-8 h-8" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => !isViewMode && fileInputRef.current?.click()}
              className={cn(
                "relative h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all",
                !isViewMode && "cursor-pointer hover:bg-agri-cream/50",
                (image || initialData?.imageUrl) ? "border-agri-green" : "border-slate-300"
              )}
            >
              {(image || initialData?.imageUrl) ? (
                <img src={image || initialData?.imageUrl} alt="Crop" className="h-full w-full object-cover rounded-lg" referrerPolicy="no-referrer" />
              ) : (
                <div className="text-center space-y-2">
                  <Camera className="w-12 h-12 mx-auto text-slate-400" />
                  <p className="text-sm text-slate-500">Tap to capture or upload photo</p>
                </div>
              )}
              {!isViewMode && (
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  accept="image/*"
                />
              )}
            </div>
            <div className="space-y-4">
              <textarea
                placeholder="Describe what you see (e.g., 'Yellow spots on maize leaves in Kumasi area')"
                className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-agri-green focus:border-transparent outline-none resize-none bg-white/50"
                value={description || initialData?.description || ""}
                onChange={(e) => !isViewMode && setDescription(e.target.value)}
                readOnly={isViewMode}
              />
              {!isViewMode && (
                <Button 
                  onClick={handleDiagnose} 
                  disabled={loading || (!image && !description)}
                  className="w-full bg-agri-green hover:bg-agri-green/90 text-white h-12 text-lg font-medium rounded-xl"
                >
                  {loading ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <Send className="mr-2 w-5 h-5" />
                  )}
                  {loading ? "Analyzing..." : "Run Synq Diagnosis"}
                </Button>
              )}
              {isViewMode && (
                <div className="p-4 bg-agri-green/5 rounded-xl border border-agri-green/10 flex items-center gap-3">
                  <ShieldCheck className="text-agri-green w-5 h-5" />
                  <span className="text-xs text-agri-green font-bold uppercase tracking-wider">Verified Record</span>
                </div>
              )}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-agri-clay/10 rounded-xl border border-agri-clay/20 flex items-start gap-3"
                >
                  <AlertTriangle className="text-agri-clay w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm text-agri-clay font-medium">{error}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDiagnose}
                      className="h-8 border-agri-clay text-agri-clay hover:bg-agri-clay/10"
                    >
                      Retry Diagnosis
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Diagnosis Card */}
              <Card className="md:col-span-2 glass-card border-none">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-serif">Diagnosis Result</CardTitle>
                    <Badge variant={result.diagnosis.severity === "High" ? "destructive" : "secondary"} className="bg-agri-clay/10 text-agri-clay border-agri-clay/20">
                      {result.diagnosis.severity} Severity
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-agri-green/5 rounded-xl border border-agri-green/10">
                    <div className="p-3 bg-agri-green/10 rounded-full">
                      <AlertTriangle className="text-agri-green w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-agri-green">{result.diagnosis.crop}</h4>
                      <p className="text-sm text-slate-600">{result.diagnosis.issue_detected}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Confidence</p>
                      <p className="text-lg font-mono font-bold text-agri-green">
                        {result.diagnosis.confidence_level <= 1 
                          ? Math.round(result.diagnosis.confidence_level * 100) 
                          : Math.round(result.diagnosis.confidence_level)}%
                      </p>
                    </div>
                  </div>

                  <Tabs defaultValue="intervention" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-agri-cream/50">
                      <TabsTrigger value="intervention">Remedy</TabsTrigger>
                      <TabsTrigger value="schedule">7-Day Plan</TabsTrigger>
                      <TabsTrigger value="local">Localization</TabsTrigger>
                    </TabsList>
                    <TabsContent value="intervention" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <h5 className="font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-agri-green" /> Immediate Action
                        </h5>
                        <p className="text-sm text-slate-600 pl-6">{result.intervention.immediate_action}</p>
                      </div>
                      <div className="space-y-2">
                        <h5 className="font-bold flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-agri-green" /> Organic Remedy
                        </h5>
                        <p className="text-sm text-slate-600 pl-6">{result.intervention.organic_remedy}</p>
                      </div>
                      <div className="space-y-2">
                        <h5 className="font-bold">Prevention Plan</h5>
                        <ul className="list-disc list-inside text-sm text-slate-600 pl-6 space-y-1">
                          {result.intervention.prevention_plan.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>
                    <TabsContent value="schedule" className="mt-4">
                      <ScrollArea className="h-48 rounded-md border p-4 bg-white/50">
                        <div className="space-y-4">
                          {result.climate_schedule?.map((day, i) => (
                            <div key={i} className="flex gap-4 items-start">
                              <div className="w-12 h-12 rounded-lg bg-agri-green/10 flex items-center justify-center shrink-0 font-bold text-agri-green">
                                D{i + 1}
                              </div>
                              <p className="text-sm text-slate-600 pt-1">{day}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="local" className="mt-4 space-y-4">
                      <div className="p-4 bg-agri-gold/5 border border-agri-gold/20 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-agri-gold">
                            <Languages className="w-5 h-5" />
                            <span className="font-bold uppercase text-xs tracking-widest">{result.localization.target_dialect} Voice Script</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-agri-gold text-agri-gold hover:bg-agri-gold/10 h-8"
                            onClick={() => handlePlayAudio(result.localization.phonetic_dialect_script)}
                            disabled={audioLoading}
                          >
                            {audioLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-2" />
                            ) : isPlaying ? (
                              <VolumeX className="w-3 h-3 mr-2" />
                            ) : (
                              <Volume2 className="w-3 h-3 mr-2" />
                            )}
                            {isPlaying ? "Stop" : "Play Voice Note"}
                          </Button>
                        </div>
                        <p className="text-lg font-serif italic text-slate-800 leading-relaxed">
                          "{result.localization.phonetic_dialect_script}"
                        </p>
                        <p className="text-xs text-slate-500 border-t border-agri-gold/10 pt-2">
                          {result.localization.english_summary}
                        </p>
                      </div>
                      {audioUrl && (
                        <audio 
                          ref={audioRef} 
                          src={audioUrl} 
                          onEnded={() => setIsPlaying(false)} 
                          className="hidden" 
                          autoPlay 
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Compliance Card */}
              <Card className="glass-card border-none h-fit">
                <CardHeader>
                  <CardTitle className="text-lg font-serif">Compliance Synq</CardTitle>
                  <CardDescription>Financial Inclusion Impact</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                  <div className="relative w-32 h-32 mx-auto">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke="#E2E8F0" 
                        strokeWidth="8" 
                      />
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke="#2D5A27" 
                        strokeWidth="8" 
                        strokeDasharray={`${result.credit_metadata.economic_impact_score * 28.27} 282.7`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                      <text x="50" y="55" textAnchor="middle" className="text-2xl font-bold fill-agri-green font-mono">
                        {result.credit_metadata.economic_impact_score}/10
                      </text>
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-700">Economic Impact Score</p>
                    <p className="text-xs text-slate-500">This intervention adds {result.credit_metadata.compliance_weight} points to your Synq Credit History.</p>
                  </div>
                  <div className="p-3 bg-agri-green/10 rounded-lg">
                    <p className="text-[10px] uppercase font-bold text-agri-green tracking-widest">Status</p>
                    <p className="text-sm font-bold text-agri-green">Compliance Verified</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
