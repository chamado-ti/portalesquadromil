import { useState, useRef, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useGuaritaAppointments } from '@/hooks/useGuaritaAppointments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  QrCode, Search, CheckCircle, XCircle, User, Clock, Building, LogIn, LogOut, Loader2, Camera, Keyboard, MessageSquare, Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GuaritaQRCodePage() {
  const { validateQRCode, validationResult, isValidating, todayAppointments, registerEntry, registerExit } = useGuaritaAppointments();
  const { toast } = useToast();
  const [qrInput, setQrInput] = useState('');
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [commentDialog, setCommentDialog] = useState(false);
  const [editTimeDialog, setEditTimeDialog] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [editEntry, setEditEntry] = useState('');
  const [editExit, setEditExit] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (scanMode === 'manual') {
      inputRef.current?.focus();
    }
  }, [scanMode]);

  const startCamera = useCallback(async () => {
    if (isCameraActive || !videoRef.current) return;
    
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          console.log('QR decoded:', decodedText);
          await scanner.stop();
          setIsCameraActive(false);
          setQrInput(decodedText);
          await validateQRCode(decodedText);
        },
        () => {}
      );
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      toast({ title: 'Erro ao abrir câmera', description: 'Verifique as permissões do navegador.', variant: 'destructive' });
    }
  }, [isCameraActive, validateQRCode, toast]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    if (scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [scanMode]);

  const handleValidate = async (action?: 'entry' | 'exit') => {
    if (!qrInput.trim()) return;
    await validateQRCode(qrInput.trim(), action);
  };

  const clearResult = () => {
    setQrInput('');
    if (scanMode === 'camera') startCamera();
    else inputRef.current?.focus();
  };

  const handleAddComment = async () => {
    if (!selectedAptId || !comment.trim()) return;
    try {
      const { error } = await supabase.from('appointments').update({ notes: comment }).eq('id', selectedAptId);
      if (error) throw error;
      toast({ title: 'Comentário salvo' });
      setCommentDialog(false);
      setComment('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleEditTime = async () => {
    if (!selectedAptId) return;
    try {
      const updates: any = {};
      if (editEntry) updates.entry_at = new Date(editEntry).toISOString();
      if (editExit) updates.exit_at = new Date(editExit).toISOString();
      
      const { error } = await supabase.from('appointments').update(updates).eq('id', selectedAptId);
      if (error) throw error;
      toast({ title: 'Horário atualizado' });
      setEditTimeDialog(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Controle de Acesso</h2>
          <p className="text-muted-foreground">Escaneie QR codes ou gerencie entradas/saídas</p>
        </div>

        {/* Scanner */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Scanner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as any)}>
              <TabsList className="mb-4">
                <TabsTrigger value="camera" className="gap-2"><Camera className="h-4 w-4" />Câmera</TabsTrigger>
                <TabsTrigger value="manual" className="gap-2"><Keyboard className="h-4 w-4" />Manual</TabsTrigger>
              </TabsList>

              <TabsContent value="camera">
                <div className="space-y-4">
                  <div id="qr-reader" ref={videoRef} className="mx-auto max-w-md overflow-hidden rounded-lg" style={{ minHeight: isCameraActive ? 300 : 0 }} />
                  {!isCameraActive && !validationResult && (
                    <div className="text-center">
                      <Button onClick={startCamera}><Camera className="mr-2 h-4 w-4" />Iniciar Câmera</Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="manual">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Escaneie ou digite o código..."
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                    className="flex-1 font-mono text-lg"
                    autoFocus
                  />
                  <Button onClick={() => handleValidate()} disabled={isValidating || !qrInput.trim()}>
                    {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="mr-2 h-4 w-4" />Validar</>}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Validation Result */}
        {validationResult && (
          <Card className="card-institutional">
            <CardContent className="pt-6">
              {validationResult.valid ? (
                <div className="space-y-4">
                  <Alert className="border-emerald-500/50 bg-emerald-500/10">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <AlertTitle className="text-emerald-600">{validationResult.message || 'QR Code Válido'}</AlertTitle>
                    <AlertDescription>
                      {validationResult.action === 'entry' ? 'Entrada registrada!' : validationResult.action === 'exit' ? 'Saída registrada!' : 'Visitante autorizado.'}
                    </AlertDescription>
                  </Alert>

                  <div className="rounded-lg border bg-secondary/30 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><User className="h-6 w-6 text-primary" /></div>
                        <div>
                          <p className="font-medium">{validationResult.appointment.visitor_name}</p>
                          {validationResult.appointment.visitor_document && <p className="text-sm text-muted-foreground">{validationResult.appointment.visitor_document}</p>}
                        </div>
                      </div>
                      {validationResult.appointment.colaborador && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10"><Building className="h-6 w-6 text-info" /></div>
                          <div>
                            <p className="font-medium">{validationResult.appointment.colaborador}</p>
                            <p className="text-sm text-muted-foreground">{validationResult.appointment.sector || 'Sem setor'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!validationResult.appointment.entry_at && (
                      <Button onClick={() => handleValidate('entry')} disabled={isValidating}><LogIn className="mr-2 h-4 w-4" />Liberar Entrada</Button>
                    )}
                    {validationResult.appointment.entry_at && !validationResult.appointment.exit_at && (
                      <Button variant="secondary" onClick={() => handleValidate('exit')} disabled={isValidating}><LogOut className="mr-2 h-4 w-4" />Registrar Saída</Button>
                    )}
                    <Button variant="outline" onClick={() => { setSelectedAptId(validationResult.appointment.id); setCommentDialog(true); }}>
                      <MessageSquare className="mr-2 h-4 w-4" />Comentário
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setSelectedAptId(validationResult.appointment.id);
                      setEditEntry(validationResult.appointment.entry_at ? new Date(validationResult.appointment.entry_at).toISOString().slice(0, 16) : '');
                      setEditExit(validationResult.appointment.exit_at ? new Date(validationResult.appointment.exit_at).toISOString().slice(0, 16) : '');
                      setEditTimeDialog(true);
                    }}>
                      <Edit className="mr-2 h-4 w-4" />Ajustar Horário
                    </Button>
                    <Button variant="outline" onClick={clearResult}>Novo Scan</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <XCircle className="h-5 w-5" />
                    <AlertTitle>QR Code Inválido</AlertTitle>
                    <AlertDescription>{validationResult.error || 'Código inválido.'}</AlertDescription>
                  </Alert>
                  <Button variant="outline" onClick={clearResult} className="w-full">Tentar Novamente</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Today's list with management */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle>Visitantes de Hoje ({todayAppointments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Nenhum agendamento hoje</p>
            ) : (
              <div className="space-y-2">
                {todayAppointments.map(apt => (
                  <div key={apt.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-sm font-bold">{apt.scheduled_time?.slice(0, 5)}</p>
                      </div>
                      <div>
                        <p className="font-medium">{apt.visitor_name}</p>
                        <p className="text-xs text-muted-foreground">{apt.user?.full_name} • {apt.purpose || 'Sem motivo'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.entry_at && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Entrada: {format(new Date(apt.entry_at), 'HH:mm')}</Badge>}
                      {apt.exit_at && <Badge variant="outline" className="bg-sky-500/10 text-sky-600">Saída: {format(new Date(apt.exit_at), 'HH:mm')}</Badge>}
                      {!apt.entry_at && (
                        <Button size="sm" variant="outline" onClick={() => registerEntry(apt.id)}><LogIn className="mr-1 h-3 w-3" />Entrada</Button>
                      )}
                      {apt.entry_at && !apt.exit_at && (
                        <Button size="sm" variant="secondary" onClick={() => registerExit(apt.id)}><LogOut className="mr-1 h-3 w-3" />Saída</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedAptId(apt.id); setComment(apt.notes || ''); setCommentDialog(true); }}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setSelectedAptId(apt.id);
                        setEditEntry(apt.entry_at ? new Date(apt.entry_at).toISOString().slice(0, 16) : '');
                        setEditExit(apt.exit_at ? new Date(apt.exit_at).toISOString().slice(0, 16) : '');
                        setEditTimeDialog(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comment Dialog */}
        <Dialog open={commentDialog} onOpenChange={setCommentDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Comentário</DialogTitle></DialogHeader>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Observações sobre a visita..." rows={4} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCommentDialog(false)}>Cancelar</Button>
              <Button onClick={handleAddComment}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Time Dialog */}
        <Dialog open={editTimeDialog} onOpenChange={setEditTimeDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajustar Horários</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Entrada</Label>
                <Input type="datetime-local" value={editEntry} onChange={(e) => setEditEntry(e.target.value)} />
              </div>
              <div>
                <Label>Saída</Label>
                <Input type="datetime-local" value={editExit} onChange={(e) => setEditExit(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTimeDialog(false)}>Cancelar</Button>
              <Button onClick={handleEditTime}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
