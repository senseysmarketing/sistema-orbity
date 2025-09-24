import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAgency } from '@/hooks/useAgency';

const createAgencySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  slug: z.string().min(2, 'Slug deve ter pelo menos 2 caracteres').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().optional(),
  contact_email: z.string().email('Email inválido').optional(),
  contact_phone: z.string().optional(),
  subscription_plan: z.enum(['free', 'basic', 'pro', 'enterprise']),
});

type CreateAgencyForm = z.infer<typeof createAgencySchema>;

interface CreateAgencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAgencyDialog({ open, onOpenChange }: CreateAgencyDialogProps) {
  const { createAgency } = useAgency();
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateAgencyForm>({
    resolver: zodResolver(createAgencySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      contact_email: '',
      contact_phone: '',
      subscription_plan: 'free',
    },
  });

  const onSubmit = async (values: CreateAgencyForm) => {
    setLoading(true);
    try {
      const agency = await createAgency(values);
      if (agency) {
        form.reset();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating agency:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from name
  const watchName = form.watch('name');
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Update slug when name changes
  if (watchName && !form.getValues('slug')) {
    form.setValue('slug', generateSlug(watchName));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Agência</DialogTitle>
          <DialogDescription>
            Crie uma nova agência para gerenciar seus clientes e projetos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Agência</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Minha Agência Digital" 
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!form.formState.dirtyFields.slug) {
                          form.setValue('slug', generateSlug(e.target.value));
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="minha-agencia-digital" 
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL única para sua agência (será usada em webhooks)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição da sua agência..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de Contato</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contato@agencia.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subscription_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plano de Assinatura</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um plano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Grátis</SelectItem>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Você pode alterar o plano posteriormente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Agência'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}