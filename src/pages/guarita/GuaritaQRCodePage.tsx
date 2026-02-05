import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useGuaritaAppointments } from '@/hooks/useGuaritaAppointments';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Clock,
  Building,
  LogIn,
  LogOut,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GuaritaQRCodePage() {
  const { validateQRCode, validationResult, isValidating } = useGuaritaAppointments();
  const [qrInput, setQrInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount for barcode scanner
    inputRef.current?.focus();
  }, []);

  const handleValidate = async (action?: 'entry' | 'exit') => {
    if (!qrInput.trim()) return;
    await validateQRCode(qrInput.trim(), action);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidate();
    }
  };

  const clearResult = () => {
    setQrInput('');
    inputRef.current?.focus();
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Leitura de QR Code</h2>
          <p className="text-muted-foreground">
            Escaneie ou digite o código para validar o acesso
          </p>
        </div>

        {/* Scanner input */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Scanner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Escaneie o QR Code ou digite o código..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 font-mono text-lg"
                autoFocus
              />
              <Button onClick={() => handleValidate()} disabled={isValidating || !qrInput.trim()}>
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Validar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Validation Result */}
        {validationResult && (
          <Card className="card-institutional">
            <CardContent className="pt-6">
              {validationResult.valid ? (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <AlertTitle className="text-green-500">
                      {validationResult.message || 'QR Code Válido'}
                    </AlertTitle>
                    <AlertDescription>
                      {validationResult.action === 'entry'
                        ? 'Entrada registrada com sucesso!'
                        : validationResult.action === 'exit'
                        ? 'Saída registrada com sucesso!'
                        : 'O visitante está autorizado a entrar.'}
                    </AlertDescription>
                  </Alert>

                  {/* Visitor details */}
                  <div className="rounded-lg border bg-secondary/30 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{validationResult.appointment.visitor_name}</p>
                          {validationResult.appointment.visitor_document && (
                            <p className="text-sm text-muted-foreground">
                              {validationResult.appointment.visitor_document}
                            </p>
                          )}
                        </div>
                      </div>

                      {validationResult.appointment.colaborador && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10">
                            <Building className="h-6 w-6 text-info" />
                          </div>
                          <div>
                            <p className="font-medium">{validationResult.appointment.colaborador}</p>
                            <p className="text-sm text-muted-foreground">
                              {validationResult.appointment.sector || 'Sem setor'}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                          <Clock className="h-6 w-6 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {validationResult.appointment.scheduled_time?.slice(0, 5) || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Duração: {validationResult.appointment.duration_minutes} min
                          </p>
                        </div>
                      </div>

                      {validationResult.appointment.purpose && (
                        <div>
                          <p className="text-sm text-muted-foreground">Motivo</p>
                          <p className="font-medium">{validationResult.appointment.purpose}</p>
                        </div>
                      )}
                    </div>

                    {/* Entry/Exit times */}
                    {(validationResult.appointment.entry_at || validationResult.appointment.exit_at) && (
                      <div className="mt-4 flex gap-4 border-t pt-4">
                        {validationResult.appointment.entry_at && (
                          <div className="flex items-center gap-2 text-sm">
                            <LogIn className="h-4 w-4 text-green-500" />
                            <span>
                              Entrada:{' '}
                              {format(new Date(validationResult.appointment.entry_at), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                        {validationResult.appointment.exit_at && (
                          <div className="flex items-center gap-2 text-sm">
                            <LogOut className="h-4 w-4 text-blue-500" />
                            <span>
                              Saída:{' '}
                              {format(new Date(validationResult.appointment.exit_at), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                        {validationResult.appointment.duration_minutes && validationResult.action === 'exit' && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                            {validationResult.appointment.duration_minutes} min no local
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {!validationResult.appointment.entry_at && (
                      <Button
                        className="flex-1"
                        onClick={() => handleValidate('entry')}
                        disabled={isValidating}
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        Liberar Entrada
                      </Button>
                    )}
                    {validationResult.appointment.entry_at && !validationResult.appointment.exit_at && (
                      <Button
                        className="flex-1"
                        variant="secondary"
                        onClick={() => handleValidate('exit')}
                        disabled={isValidating}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Registrar Saída
                      </Button>
                    )}
                    <Button variant="outline" onClick={clearResult}>
                      Novo Scan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <XCircle className="h-5 w-5" />
                    <AlertTitle>QR Code Inválido</AlertTitle>
                    <AlertDescription>
                      {validationResult.error || 'Este código não é válido ou já foi utilizado.'}
                    </AlertDescription>
                  </Alert>

                  {validationResult.appointment && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                      <p className="font-medium">{validationResult.appointment.visitor_name}</p>
                      {validationResult.appointment.scheduled_date && (
                        <p className="text-sm text-muted-foreground">
                          Agendado para:{' '}
                          {format(new Date(validationResult.appointment.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  )}

                  <Button variant="outline" onClick={clearResult} className="w-full">
                    Tentar Novamente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!validationResult && (
          <Card className="card-institutional">
            <CardContent className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <QrCode className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-medium">Aguardando leitura</h3>
              <p className="text-muted-foreground">
                Posicione o QR Code no leitor ou digite o código manualmente no campo acima.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
