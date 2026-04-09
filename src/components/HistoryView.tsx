import React, { useEffect, useState } from "react";
import { db, collection, query, where, orderBy, onSnapshot, Timestamp, OperationType, handleFirestoreError } from "../firebase";
import { useAuth } from "./AuthProvider";
import { DiagnosisRecord } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, AlertTriangle, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

export default function HistoryView({ onSelect }: { onSelect: (record: DiagnosisRecord) => void }) {
  const { user } = useAuth();
  const [records, setRecords] = useState<DiagnosisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "diagnoses"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DiagnosisRecord[];
      
      // Sort client-side to avoid index requirement
      data.sort((a, b) => {
        const timeA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : 0;
        return timeB - timeA;
      });

      setRecords(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "diagnoses");
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading history...</div>;
  if (records.length === 0) return <div className="p-8 text-center text-slate-400">No diagnostic history found.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-serif text-agri-green px-2">Synq History</h2>
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3 p-2">
          {records.map((record) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => onSelect(record)}
              className="cursor-pointer"
            >
              <Card className="glass-card border-none hover:bg-white transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    {record.imageUrl ? (
                      <img src={record.imageUrl} alt="Crop" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] border-agri-green text-agri-green">
                        {record.diagnosis.crop}
                      </Badge>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {record.timestamp instanceof Timestamp ? record.timestamp.toDate().toLocaleDateString() : "Recent"}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 truncate">{record.diagnosis.issue_detected}</h4>
                    <p className="text-xs text-slate-500 truncate">{record.localization.english_summary}</p>
                  </div>
                  <ChevronRight className="text-slate-300 w-5 h-5" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
