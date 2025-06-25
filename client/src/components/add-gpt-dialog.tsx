import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGptSchema, type InsertGpt } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@shared/schema";

// Esquema estendido para validação adicional
const createGptSchema = insertGptSchema.extend({
  gptUrl: z
    .string()
    .min(1, "A URL do GPT é obrigatória")
    .url("A URL deve ser válida")
    .refine(
      (val) => val.includes("chatgpt.com/g/"), 
      { message: "A URL deve ser de um GPT do ChatGPT (formato: https://chatgpt.com/g/[ID-DO-GPT])" }
    ),
});

// Tipagem para o formulário
type CreateGptFormValues = z.infer<typeof createGptSchema>;

interface AddGptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddGptDialog({ open, onOpenChange }: AddGptDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Buscar todas as categorias
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Definir formulário com validação
  const form = useForm<CreateGptFormValues>({
    resolver: zodResolver(createGptSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      creatorName: "",
      gptUrl: "",
      imageUrl: "",
    },
  });
  
  // Mutação para criar GPT
  const createGptMutation = useMutation({
    mutationFn: async (data: CreateGptFormValues) => {
      setIsSubmitting(true);
      try {
        const response = await apiRequest("POST", "/api/gpts", data);
        return await response.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      // Limpar formulário
      form.reset();
      
      // Fechar o modal
      onOpenChange(false);
      
      // Notificar usuário
      toast({
        title: "GPT adicionado",
        description: "Seu GPT foi adicionado com sucesso!",
      });
      
      // Invalidar queries para atualizar listas
      queryClient.invalidateQueries({ queryKey: ["/api/gpts/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gpts/new"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar GPT",
        description: error.message || "Não foi possível adicionar o GPT. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Manipular submissão do formulário
  const onSubmit = (data: CreateGptFormValues) => {
    createGptMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar novo GPT</DialogTitle>
          <DialogDescription>
            Compartilhe um GPT especializado para o ambiente jurídico.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do GPT" className="h-8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva o propósito e funcionalidades deste GPT" 
                      className="resize-none" 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="creatorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Criador</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nome de quem criou o GPT" 
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      value={field.value || ''}
                      name={field.name}
                      ref={field.ref}
                      className="h-8"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Informe o nome da pessoa que criou este GPT.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="gptUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do GPT</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://chatgpt.com/g/g-xxxxx" 
                      className="h-8"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Cole a URL completa do seu GPT customizado no ChatGPT.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem (opcional)</FormLabel>
                  <div className="space-y-2">
                    {/* Campo para URL da imagem */}
                    <div>
                      <FormLabel className="text-xs text-muted-foreground mb-1">Opção 1: Colando URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://exemplo.com/imagem.jpg" 
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          value={field.value || ''}
                          name={field.name}
                          ref={field.ref}
                          className="text-sm h-8"
                        />
                      </FormControl>
                    </div>
                    
                    {/* OU divisor */}
                    <div className="relative py-1">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-background px-2 text-muted-foreground">
                          OU
                        </span>
                      </div>
                    </div>
                    
                    {/* Upload de arquivo */}
                    <div>
                      <FormLabel className="text-xs text-muted-foreground mb-1">Opção 2: Fazendo upload</FormLabel>
                      <div>
                        <div className="flex items-center gap-3">
                          <Input
                            type="file"
                            id="image-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              // Verificar tamanho (máximo 5MB)
                              if (file.size > 5 * 1024 * 1024) {
                                toast({
                                  title: "Arquivo muito grande",
                                  description: "O tamanho máximo permitido é 5MB.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              // Criar formulário para envio
                              const formData = new FormData();
                              formData.append('image', file);
                              
                              try {
                                setIsSubmitting(true);
                                const response = await fetch('/api/upload/image', {
                                  method: 'POST',
                                  body: formData,
                                  credentials: 'include'
                                });
                                
                                if (!response.ok) {
                                  throw new Error('Falha ao enviar imagem');
                                }
                                
                                const data = await response.json();
                                
                                // Atualizar o campo com a URL da imagem enviada
                                field.onChange(data.url);
                                
                                toast({
                                  title: "Imagem enviada",
                                  description: "Sua imagem foi enviada com sucesso!",
                                });
                              } catch (error) {
                                toast({
                                  title: "Erro ao enviar imagem",
                                  description: error instanceof Error ? error.message : "Ocorreu um erro ao fazer upload da imagem",
                                  variant: "destructive",
                                });
                              } finally {
                                setIsSubmitting(false);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('image-upload')?.click()}
                            disabled={isSubmitting}
                            className="h-8 text-xs"
                          >
                            {isSubmitting ? (
                              <span className="animate-spin mr-1">⟳</span>
                            ) : (
                              "Selecionar arquivo"
                            )}
                          </Button>
                          {field.value && field.value.startsWith('/uploads/') && (
                            <span className="text-xs text-muted-foreground">
                              Imagem enviada com sucesso
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Prévia da imagem */}
                    {field.value && (
                      <div className="mt-1">
                        <p className="text-xs mb-1">Prévia:</p>
                        <div className="relative h-24 w-full overflow-hidden rounded-md border">
                          <img
                            src={field.value}
                            alt="Prévia da imagem"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "https://placehold.co/600x400?text=Imagem+inválida";
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <FormDescription className="text-xs mt-1">
                    URL direta ou arquivo do seu computador. Deixe em branco para usar a imagem padrão.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-8 text-sm">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="h-8 text-sm">
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-1">⟳</span> Salvando...
                  </>
                ) : (
                  "Adicionar GPT"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}