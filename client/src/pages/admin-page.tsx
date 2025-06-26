import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { User, InsertUser, Gpt, Category } from "@shared/schema";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import Footer from "@/components/layout/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserPlus, Edit, Trash2, Play, Pause, PlusCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import AddGptDialog from "@/components/add-gpt-dialog";

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isAddGptDialogOpen, setIsAddGptDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [resetPasswordUserName, setResetPasswordUserName] = useState<string>("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = "GPT da Câmara Regional de Caruaru do TJPE - Administração";
  }, []);

  // Redirect if not admin
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  // Fetch users
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch GPTs
  const {
    data: gpts = [],
    isLoading: gptsLoading,
    error: gptsError,
  } = useQuery<Gpt[]>({
    queryKey: ["/api/gpts"],
  });

  // Fetch categories
  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // User form schema
  const userSchema = z.object({
    name: z.string().min(2, "Nome completo deve ter pelo menos 2 caracteres"),
    username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
    role: z.enum(["user", "magistrate", "admin"]).default("user"),
  });

  // Reset Password form schema
  const resetPasswordSchema = z.object({
    newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"]
  });

  // User form
  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  // Reset password form
  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Create/update user mutation
  const userMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof userSchema>) => {
      if (editingUser) {
        // Update existing user
        const response = await apiRequest(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          body: JSON.stringify(userData),
        });
        if (!response.ok) {
          throw new Error("Erro ao atualizar usuário");
        }
        return response.json();
      } else {
        // Create new user
        const response = await apiRequest("/api/users", {
          method: "POST",
          body: JSON.stringify(userData),
        });
        if (!response.ok) {
          throw new Error("Erro ao criar usuário");
        }
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsUserDialogOpen(false);
      setEditingUser(null);
      userForm.reset();
      toast({
        title: "Sucesso",
        description: editingUser ? "Usuário atualizado com sucesso" : "Usuário criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest(`/api/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Erro ao remover usuário");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete GPT mutation
  const deleteGptMutation = useMutation({
    mutationFn: async (gptId: number) => {
      const response = await apiRequest(`/api/gpts/${gptId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Erro ao remover GPT");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gpts"] });
      toast({
        title: "Sucesso",
        description: "GPT removido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (passwordData: z.infer<typeof resetPasswordSchema>) => {
      if (!resetPasswordUserId) {
        throw new Error("ID do usuário não encontrado");
      }
      
      const response = await apiRequest(`/api/users/${resetPasswordUserId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({
          newPassword: passwordData.newPassword,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Erro ao redefinir senha");
      }
    },
    onSuccess: () => {
      setIsResetPasswordDialogOpen(false);
      setResetPasswordUserId(null);
      setResetPasswordUserName("");
      resetPasswordForm.reset();
      toast({
        title: "Sucesso",
        description: "Senha redefinida com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Simple toggle feature mutation for GPTs
  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ gptId, isFeatured }: { gptId: number; isFeatured: boolean }) => {
      const response = await apiRequest(`/api/gpts/${gptId}/toggle-feature`, {
        method: "PATCH",
        body: JSON.stringify({ isFeatured }),
      });
      if (!response.ok) {
        throw new Error("Erro ao atualizar destaque");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gpts"] });
      toast({
        title: "Sucesso",
        description: "Status de destaque atualizado",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Open user dialog for editing
  const openUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      userForm.reset({
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      });
    } else {
      setEditingUser(null);
      userForm.reset({
        name: "",
        username: "",
        email: "",
        password: "",
        role: "user",
      });
    }
    setIsUserDialogOpen(true);
  };

  // Open reset password dialog
  const openResetPasswordDialog = (user: User) => {
    setResetPasswordUserId(user.id);
    setResetPasswordUserName(user.name);
    resetPasswordForm.reset();
    setIsResetPasswordDialogOpen(true);
  };

  const handleUserSubmit = (values: z.infer<typeof userSchema>) => {
    userMutation.mutate(values);
  };

  const handleResetPasswordSubmit = (values: z.infer<typeof resetPasswordSchema>) => {
    resetPasswordMutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-screen pt-16 pb-8 px-4 sm:px-6 lg:px-8 ml-64">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Administração</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie usuários, GPTs e configurações do sistema
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="gpts">GPTs</TabsTrigger>
                <TabsTrigger value="users">Usuários</TabsTrigger>
              </TabsList>

              {/* Dashboard Tab */}
              <TabsContent value="dashboard">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg mr-4">
                          <i className="ri-robot-line text-2xl text-blue-600"></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total de GPTs</p>
                          <p className="text-2xl font-bold">{gpts.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg mr-4">
                          <i className="ri-user-line text-2xl text-green-600"></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                          <p className="text-2xl font-bold">{users.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg mr-4">
                          <i className="ri-star-line text-2xl text-yellow-600"></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">GPTs em Destaque</p>
                          <p className="text-2xl font-bold">{gpts.filter(g => g.isFeatured).length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg mr-4">
                          <i className="ri-folder-line text-2xl text-purple-600"></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Categorias</p>
                          <p className="text-2xl font-bold">{categories.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            
              {/* GPTs Tab */}
              <TabsContent value="gpts">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Gerenciamento de GPTs</h2>
                  <Button 
                    onClick={() => setIsAddGptDialogOpen(true)}
                    className="bg-accent hover:bg-accent-hover"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Novo GPT
                  </Button>
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Criador</TableHead>
                          <TableHead>Visitas</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gptsLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : gpts.map((gpt) => (
                          <TableRow key={gpt.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                {gpt.imageUrl ? (
                                  <img 
                                    src={gpt.imageUrl} 
                                    alt={gpt.title} 
                                    className="w-10 h-10 rounded object-cover mr-3" 
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-primary-light flex items-center justify-center mr-3">
                                    <i className="ri-robot-line text-accent"></i>
                                  </div>
                                )}
                                {gpt.title}
                              </div>
                            </TableCell>
                            <TableCell>{gpt.category}</TableCell>
                            <TableCell>{gpt.creatorName || "—"}</TableCell>
                            <TableCell>{gpt.views}</TableCell>
                            <TableCell>
                              {gpt.isFeatured && (
                                <span className="bg-accent py-1 px-2 rounded-full text-xs mr-1">
                                  Destaque
                                </span>
                              )}
                              {gpt.isNew && (
                                <span className="bg-green-900 text-green-200 py-1 px-2 rounded-full text-xs mr-1">
                                  Novo
                                </span>
                              )}
                              {!gpt.isFeatured && !gpt.isNew && (
                                <span className="bg-blue-900 text-blue-200 py-1 px-2 rounded-full text-xs">
                                  Ativo
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteGptMutation.mutate(gpt.id)}
                                  title="Remover"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {!gpt.isFeatured ? (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-warning hover:text-warning"
                                    title="Marcar como Destaque"
                                    onClick={() => toggleFeatureMutation.mutate({ 
                                      gptId: gpt.id,
                                      isFeatured: true
                                    })}
                                  >
                                    <i className="ri-star-line"></i>
                                  </Button>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-warning hover:text-warning"
                                    title="Remover Destaque"
                                    onClick={() => toggleFeatureMutation.mutate({ 
                                      gptId: gpt.id,
                                      isFeatured: false
                                    })}
                                  >
                                    <i className="ri-star-fill"></i>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            
              {/* Users Tab */}
              <TabsContent value="users">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Gerenciamento de Usuários</h2>
                  <Button 
                    onClick={() => openUserDialog()}
                    className="bg-accent hover:bg-accent-hover"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Usuário
                  </Button>
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center mr-3">
                                  <span className="text-sm font-semibold">
                                    {user.name.charAt(0)}
                                  </span>
                                </div>
                                {user.name}
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              {user.role === 'admin' && (
                                <span className="bg-green-900 text-green-200 py-1 px-2 rounded-full text-xs">
                                  Administrador
                                </span>
                              )}
                              {user.role === 'magistrate' && (
                                <span className="bg-blue-900 text-blue-200 py-1 px-2 rounded-full text-xs">
                                  Magistrado
                                </span>
                              )}
                              {user.role === 'user' && (
                                <span className="bg-purple-900 text-purple-200 py-1 px-2 rounded-full text-xs">
                                  Usuário
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-success flex items-center">
                                <i className="ri-checkbox-circle-fill mr-1"></i> Ativo
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openUserDialog(user)}
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  title="Remover"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-blue-600 hover:text-blue-600"
                                  onClick={() => openResetPasswordDialog(user)}
                                  title="Redefinir Senha"
                                >
                                  <i className="ri-lock-password-line"></i>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <Footer />

      {/* User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {editingUser 
                ? "Edite as informações do usuário abaixo." 
                : "Preencha as informações para criar um novo usuário."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(handleUserSubmit)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Usuário</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {!editingUser && (
                <FormField
                  control={userForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Senha deve ter pelo menos 6 caracteres.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="magistrate">Magistrado</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsUserDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-accent hover:bg-accent-hover"
                  disabled={userMutation.isPending}
                >
                  {userMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para o usuário {resetPasswordUserName}.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(handleResetPasswordSubmit)} className="space-y-4">
              <FormField
                control={resetPasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormDescription>
                      A senha deve ter pelo menos 6 caracteres.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={resetPasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsResetPasswordDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-accent hover:bg-accent-hover"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redefinindo...
                    </>
                  ) : (
                    "Redefinir Senha"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add GPT Dialog */}
      <AddGptDialog 
        open={isAddGptDialogOpen} 
        onOpenChange={setIsAddGptDialogOpen} 
      />
    </div>
  );
}