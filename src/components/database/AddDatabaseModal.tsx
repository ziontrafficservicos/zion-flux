import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "lucide-react";

interface AddDatabaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddDatabaseModal({ open, onOpenChange, onSuccess }: AddDatabaseModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    database_key: "",
    url: "",
    anon_key: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('sieg_fin_database_configs')
        .insert([formData]);

      if (error) throw error;

      toast.success('Banco adicionado com sucesso!');
      onOpenChange(false);
      setFormData({ name: "", database_key: "", url: "", anon_key: "" });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar banco');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Adicionar Novo Banco
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Banco</Label>
            <Input
              id="name"
              placeholder="Ex: SIEG, Cliente XYZ"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="database_key">Chave Única</Label>
            <Input
              id="database_key"
              placeholder="Ex: sieg, cliente-xyz"
              value={formData.database_key}
              onChange={(e) => setFormData({ ...formData, database_key: e.target.value.toLowerCase() })}
              required
            />
            <p className="text-xs text-muted-foreground">Use apenas letras minúsculas e hífens</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL do Banco de Dados</Label>
            <Input
              id="url"
              placeholder="https://xxxxx.supabase.co"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anon_key">Anon Key</Label>
            <Input
              id="anon_key"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={formData.anon_key}
              onChange={(e) => setFormData({ ...formData, anon_key: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Salvando...' : 'Adicionar Banco'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
