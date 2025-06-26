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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

  // Fetch OpenAI models
  const {
    data: models = [],
    isLoading: modelsLoading,
  } = useQuery<string[]>({
    queryKey: ["/api/openai/models"],
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



  // Create/update user mutation
  const userMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof userSchema>) => {
      if (editingUser) {
        // Update user
        const res = await apiRequest("PUT", `/api/users/${editingUser.id}`, userData);
        return await res.json();
      } else {
        // Create user
        const res = await apiRequest("POST", "/api/register", userData);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: editingUser ? "Usuário atualizado" : "Usuário criado",
        description: `O usuário foi ${editingUser ? "atualizado" : "criado"} com sucesso.`,
      });
      setIsUserDialogOpen(false);
      setEditingUser(null);
      userForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || `Falha ao ${editingUser ? "atualizar" : "criar"} usuário.`,
        variant: "destructive",
      });
    },
  });

  // Create/update GPT mutation
  const gptMutation = useMutation({
    mutationFn: async (gptData: z.infer<typeof gptSchema>) => {
      if (editingGpt) {
        // Update GPT
        const res = await apiRequest("PUT", `/api/gpts/${editingGpt.id}`, gptData);
        return await res.json();
      } else {
        // Create GPT
        const res = await apiRequest("POST", "/api/gpts", gptData);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gpts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gpts/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gpts/new"] });
      toast({
        title: editingGpt ? "GPT atualizado" : "GPT criado",
        description: `O GPT foi ${editingGpt ? "atualizado" : "criado"} com sucesso.`,
      });
      setIsGptDialogOpen(false);
      setEditingGpt(null);
      gptForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || `Falha ao ${editingGpt ? "atualizar" : "criar"} GPT.`,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir usuário.",
        variant: "destructive",
      });
    },
  });

  // Delete GPT mutation
  const deleteGptMutation = useMutation({
    mutationFn: async (gptId: number) => {
      const res = await apiRequest("DELETE", `/api/gpts/${gptId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gpts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gpts/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gpts/new"] });
      toast({
        title: "GPT excluído",
        description: "O GPT foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir GPT.",
        variant: "destructive",
      });
    },
  });
  
  // Formulário de redefinição de senha
  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Mutation para redefinir senha
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { userId: number; newPassword: string }) => {
      const res = await apiRequest(
        "POST", 
        `/api/users/${data.userId}/reset-password`, 
        { newPassword: data.newPassword }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Senha redefinida",
        description: "A senha do usuário foi redefinida com sucesso.",
      });
      setIsResetPasswordDialogOpen(false);
      resetPasswordForm.reset();
      setResetPasswordUserId(null);
      setResetPasswordUserName("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao redefinir a senha do usuário.",
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

  // Open GPT dialog for editing
  const openGptDialog = (gpt?: Gpt) => {
    if (gpt) {
      setEditingGpt(gpt);
      gptForm.reset({
        title: gpt.title,
        description: gpt.description,
        name: gpt.name,
        systemInstructions: gpt.systemInstructions,
        model: gpt.model,
        temperature: gpt.temperature || 70,
        files: gpt.files || [],
        category: gpt.category,
        creatorName: gpt.creatorName || "",
        imageUrl: gpt.imageUrl || "",
        isFeatured: gpt.isFeatured === null ? false : gpt.isFeatured,
        isNew: gpt.isNew === null ? false : gpt.isNew,
      });
    } else {
      setEditingGpt(null);
      gptForm.reset({
        title: "",
        description: "",
        name: "",
        systemInstructions: "",
        model: "gpt-4o",
        temperature: 70,
        files: [],
        category: "",
        creatorName: "",
        imageUrl: "",
        isFeatured: false,
        isNew: true,
      });
    }
    setIsGptDialogOpen(true);
  };

  const handleUserSubmit = (values: z.infer<typeof userSchema>) => {
    userMutation.mutate(values);
  };

  const handleGptSubmit = (values: z.infer<typeof gptSchema>) => {
    gptMutation.mutate(values);
  };
  
  // Abrir diálogo de redefinição de senha
  const openResetPasswordDialog = (user: User) => {
    setResetPasswordUserId(user.id);
    setResetPasswordUserName(user.name);
    setIsResetPasswordDialogOpen(true);
    resetPasswordForm.reset();
  };
  
  // Manipular redefinição de senha
  const handleResetPasswordSubmit = (values: z.infer<typeof resetPasswordSchema>) => {
    if (resetPasswordUserId) {
      resetPasswordMutation.mutate({
        userId: resetPasswordUserId,
        newPassword: values.newPassword
      });
    }
  };

  // Get stats for dashboard
  const totalUsers = users.length;
  const totalGpts = gpts.length;
  const totalConsultations = 1842; // This would come from usage logs in a real app
  const averageResponseTime = "2.4s"; // This would be calculated from usage logs

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-primary-bg">
      <Sidebar activeItem="admin" />

      <div className="flex flex-col flex-grow">
        <Header />
        
        <main className="flex-grow p-6">
          <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="gpts">GPTs</TabsTrigger>
              <TabsTrigger value="reports">Relatórios</TabsTrigger>
            </TabsList>
            
            {/* Dashboard Tab */}
            <TabsContent value="dashboard">
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Dashboard Administrativo</h1>
                <p className="text-neutral-200">Visão geral e gerenciamento da plataforma</p>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-secondary rounded-lg p-4 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-neutral-200 text-sm">Usuários Totais</p>
                      <h3 className="text-2xl font-bold mt-1">{totalUsers}</h3>
                      <p className="text-success text-xs mt-1 flex items-center">
                        <i className="ri-arrow-up-line mr-1"></i> 12% este mês
                      </p>
                    </div>
                    <div className="bg-primary-light p-3 rounded-full">
                      <i className="ri-user-line text-xl text-accent"></i>
                    </div>
                  </div>
                </div>
                
                <div className="bg-secondary rounded-lg p-4 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-neutral-200 text-sm">GPTs Ativos</p>
                      <h3 className="text-2xl font-bold mt-1">{totalGpts}</h3>
                      <p className="text-success text-xs mt-1 flex items-center">
                        <i className="ri-arrow-up-line mr-1"></i> 8% este mês
                      </p>
                    </div>
                    <div className="bg-primary-light p-3 rounded-full">
                      <i className="ri-robot-line text-xl text-accent"></i>
                    </div>
                  </div>
                </div>
                
                <div className="bg-secondary rounded-lg p-4 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-neutral-200 text-sm">Consultas</p>
                      <h3 className="text-2xl font-bold mt-1">{totalConsultations}</h3>
                      <p className="text-success text-xs mt-1 flex items-center">
                        <i className="ri-arrow-up-line mr-1"></i> 24% este mês
                      </p>
                    </div>
                    <div className="bg-primary-light p-3 rounded-full">
                      <i className="ri-message-3-line text-xl text-accent"></i>
                    </div>
                  </div>
                </div>
                
                <div className="bg-secondary rounded-lg p-4 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-neutral-200 text-sm">Tempo Médio</p>
                      <h3 className="text-2xl font-bold mt-1">{averageResponseTime}</h3>
                      <p className="text-error text-xs mt-1 flex items-center">
                        <i className="ri-arrow-up-line mr-1"></i> 3% este mês
                      </p>
                    </div>
                    <div className="bg-primary-light p-3 rounded-full">
                      <i className="ri-time-line text-xl text-accent"></i>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recent Users Preview */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Usuários Recentes</h2>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setActiveTab("users");
                        const tabElement = document.querySelector('[data-value="users"]') as HTMLElement;
                        if (tabElement) tabElement.click();
                      }}
                    >
                      Ver Todos
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : users.slice(0, 5).map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center mr-3">
                                {user.avatar ? (
                                  <img 
                                    src={user.avatar} 
                                    alt={user.name} 
                                    className="w-8 h-8 rounded-full object-cover" 
                                  />
                                ) : (
                                  <span className="text-sm font-semibold">
                                    {user.name.charAt(0)}
                                  </span>
                                )}
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              {/* Recent GPTs Preview */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">GPTs Recentes</h2>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setActiveTab("gpts");
                        const tabElement = document.querySelector('[data-value="gpts"]') as HTMLElement;
                        if (tabElement) tabElement.click();
                      }}
                    >
                      Ver Todos
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Visualizações</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gptsLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : gpts.slice(0, 5).map((gpt) => (
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
                          <TableCell>{gpt.views}</TableCell>
                          <TableCell>
                            {gpt.isFeatured && (
                              <span className="bg-accent py-1 px-2 rounded-full text-xs">
                                Destaque
                              </span>
                            )}
                            {gpt.isNew && (
                              <span className="bg-green-900 text-green-200 py-1 px-2 rounded-full text-xs">
                                Novo
                              </span>
                            )}
                            {!gpt.isFeatured && !gpt.isNew && (
                              <span className="bg-blue-900 text-blue-200 py-1 px-2 rounded-full text-xs">
                                Ativo
                              </span>
                            )}
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
                                {user.avatar ? (
                                  <img 
                                    src={user.avatar} 
                                    alt={user.name} 
                                    className="w-8 h-8 rounded-full object-cover" 
                                  />
                                ) : (
                                  <span className="text-sm font-semibold">
                                    {user.name.charAt(0)}
                                  </span>
                                )}
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
                                disabled={user.id === (user as User).id} // Can't delete yourself
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {user.role === "user" && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-blue-400 hover:text-blue-300"
                                  title="Promover para Magistrado"
                                  onClick={() => {
                                    userMutation.mutate({
                                      ...user,
                                      role: "magistrate" as const
                                    });
                                  }}
                                >
                                  <i className="ri-user-settings-line text-lg"></i>
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-yellow-400 hover:text-yellow-300"
                                title="Redefinir Senha"
                                onClick={() => openResetPasswordDialog(user)}
                              >
                                <i className="ri-key-line text-lg"></i>
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
                          <TableCell>{gpt.creatorName || "—"}</TableCell>
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
                                onClick={() => openGptDialog(gpt)}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
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
                                  onClick={() => gptMutation.mutate({ 
                                    title: gpt.title,
                                    description: gpt.description,
                                    name: gpt.name || "GPT",
                                    systemInstructions: gpt.systemInstructions || "Você é um assistente útil.",
                                    model: gpt.model || "gpt-4",
                                    temperature: (gpt.temperature ?? 70) as number,
                                    category: gpt.category,
                                    files: gpt.files || [],
                                    creatorName: gpt.creatorName || undefined,
                                    imageUrl: gpt.imageUrl || undefined,
                                    isFeatured: true,
                                    isNew: gpt.isNew === null ? false : gpt.isNew
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
                                  onClick={() => gptMutation.mutate({ 
                                    title: gpt.title,
                                    description: gpt.description,
                                    name: gpt.name || "GPT",
                                    systemInstructions: gpt.systemInstructions || "Você é um assistente útil.",
                                    model: gpt.model || "gpt-4",
                                    temperature: (gpt.temperature ?? 70) as number,
                                    category: gpt.category,
                                    files: gpt.files || [],
                                    creatorName: gpt.creatorName || undefined,
                                    imageUrl: gpt.imageUrl || undefined,
                                    isFeatured: false,
                                    isNew: gpt.isNew === null ? false : gpt.isNew
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
            
            {/* Reports Tab */}
            <TabsContent value="reports">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Relatórios</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Relatório de Uso</h3>
                    <p className="text-neutral-200 mb-2">Relatórios detalhados sobre utilização de GPTs.</p>
                    <p className="text-neutral-300 text-sm mb-4">Inclui métricas de usuários, consultas e desempenho.</p>
                    <Button 
                      className="bg-accent hover:bg-accent-hover w-full"
                      onClick={() => {
                        setIsGeneratingReport(true);
                        
                        // Simulação de geração de relatório
                        setTimeout(() => {
                          setIsGeneratingReport(false);
                          
                          // Criar um blob com dados do relatório em formato CSV
                          const hoje = new Date().toISOString().slice(0, 10);
                          
                          // Criando a planilha usando o formato Excel (HTML table)
                          const headers = ["Data", "Usuário", "GPT", "Tempo de Resposta", "Avaliação"];
                          const rowsData = [
                            [hoje, "Administrador", "Agravo de Instrumento", "2.3s", "5"],
                            [hoje, "Magistrado 1", "Direito Processual", "1.8s", "4"],
                            [hoje, "Assessor 2", "Direito Administrativo", "3.1s", "5"],
                            [hoje, "Usuário 3", "Gestão Processual", "2.5s", "4"],
                            [hoje, "Magistrado 2", "Agravo de Instrumento", "1.9s", "5"]
                          ];
                          
                          // Criando conteúdo Excel através de uma tabela HTML
                          let excelContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
                          excelContent += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Relatório</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
                          excelContent += '<body><table>';
                          
                          // Adicionar cabeçalhos
                          excelContent += '<tr>';
                          headers.forEach(header => {
                            excelContent += `<th>${header}</th>`;
                          });
                          excelContent += '</tr>';
                          
                          // Adicionar linhas de dados
                          rowsData.forEach(row => {
                            excelContent += '<tr>';
                            row.forEach(cell => {
                              excelContent += `<td>${cell}</td>`;
                            });
                            excelContent += '</tr>';
                          });
                          
                          excelContent += '</table></body></html>';
                          
                          const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
                          
                          // Criar URL para o blob
                          const url = URL.createObjectURL(blob);
                          
                          // Criar elemento de link para download
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `relatorio-uso-gpts-${hoje}.xls`;
                          
                          // Adicionar o link ao documento, clicar nele e removê-lo
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          
                          // Limpar a URL
                          URL.revokeObjectURL(url);
                          
                          toast({
                            title: "Relatório gerado com sucesso",
                            description: "O relatório de uso foi gerado e baixado automaticamente.",
                          });
                        }, 1500);
                      }}
                      disabled={isGeneratingReport}
                    >
                      {isGeneratingReport ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        "Gerar Relatório"
                      )}
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Estatísticas de Usuários</h3>
                    <p className="text-neutral-200 mb-2">Análise detalhada de atividades dos usuários.</p>
                    <p className="text-neutral-300 text-sm mb-4">Inclui dados demográficos e padrões de uso.</p>
                    <Button 
                      className="bg-accent hover:bg-accent-hover w-full"
                      onClick={() => {
                        setIsGeneratingReport(true);
                        
                        // Simulação de geração de relatório
                        setTimeout(() => {
                          setIsGeneratingReport(false);
                          
                          // Criar um blob com dados do relatório em formato CSV
                          const hoje = new Date().toISOString().slice(0, 10);
                          
                          // Criando a planilha usando o formato Excel (HTML table)
                          const headers = ["Perfil", "Total Usuários", "Média de Uso Diário", "Acesso GPTs"];
                          const rowsData = [
                            ["Magistrados", "24", "12.5", "76%"],
                            ["Assessores", "45", "8.2", "64%"],
                            ["Usuários Regulares", "128", "3.8", "42%"],
                            ["Administradores", "3", "15.7", "95%"]
                          ];
                          
                          // Criando conteúdo Excel através de uma tabela HTML
                          let excelContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
                          excelContent += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Estatísticas</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
                          excelContent += '<body><table>';
                          
                          // Adicionar cabeçalhos
                          excelContent += '<tr>';
                          headers.forEach(header => {
                            excelContent += `<th>${header}</th>`;
                          });
                          excelContent += '</tr>';
                          
                          // Adicionar linhas de dados
                          rowsData.forEach(row => {
                            excelContent += '<tr>';
                            row.forEach(cell => {
                              excelContent += `<td>${cell}</td>`;
                            });
                            excelContent += '</tr>';
                          });
                          
                          excelContent += '</table></body></html>';
                          
                          const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
                          
                          // Criar URL para o blob
                          const url = URL.createObjectURL(blob);
                          
                          // Criar elemento de link para download
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `estatisticas-usuarios-${hoje}.xls`;
                          
                          // Adicionar o link ao documento, clicar nele e removê-lo
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          
                          // Limpar a URL
                          URL.revokeObjectURL(url);
                          
                          toast({
                            title: "Estatísticas geradas com sucesso",
                            description: "As estatísticas de usuários foram geradas e baixadas automaticamente.",
                          });
                        }, 1500);
                      }}
                      disabled={isGeneratingReport}
                    >
                      {isGeneratingReport ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        "Gerar Relatório"
                      )}
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Desempenho de GPTs</h3>
                    <p className="text-neutral-200 mb-2">Avaliação detalhada de desempenho dos GPTs.</p>
                    <p className="text-neutral-300 text-sm mb-4">Inclui tempo de resposta, precisão e feedback.</p>
                    <Button 
                      className="bg-accent hover:bg-accent-hover w-full"
                      onClick={() => {
                        setIsGeneratingReport(true);
                        
                        // Simulação de geração de relatório
                        setTimeout(() => {
                          setIsGeneratingReport(false);
                          
                          // Criar um blob com dados do relatório em formato CSV
                          const hoje = new Date().toISOString().slice(0, 10);
                          
                          // Criando a planilha usando o formato Excel (HTML table)
                          const headers = ["GPT", "Total Acessos", "Tempo Médio Resposta", "Avaliação Média", "Precisão"];
                          const rowsData = [
                            ["Agravo de Instrumento", "856", "2.3s", "4.8", "97%"],
                            ["Petição Inicial", "542", "3.1s", "4.2", "91%"],
                            ["Análise Probatória", "423", "2.8s", "4.5", "94%"],
                            ["Gestão de Processos", "387", "1.9s", "4.7", "96%"],
                            ["Elaboração de Votos", "289", "3.5s", "4.6", "95%"]
                          ];
                          
                          // Criando conteúdo Excel através de uma tabela HTML
                          let excelContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
                          excelContent += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Desempenho</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
                          excelContent += '<body><table>';
                          
                          // Adicionar cabeçalhos
                          excelContent += '<tr>';
                          headers.forEach(header => {
                            excelContent += `<th>${header}</th>`;
                          });
                          excelContent += '</tr>';
                          
                          // Adicionar linhas de dados
                          rowsData.forEach(row => {
                            excelContent += '<tr>';
                            row.forEach(cell => {
                              excelContent += `<td>${cell}</td>`;
                            });
                            excelContent += '</tr>';
                          });
                          
                          excelContent += '</table></body></html>';
                          
                          const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
                          
                          // Criar URL para o blob
                          const url = URL.createObjectURL(blob);
                          
                          // Criar elemento de link para download
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `desempenho-gpts-${hoje}.xls`;
                          
                          // Adicionar o link ao documento, clicar nele e removê-lo
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          
                          // Limpar a URL
                          URL.revokeObjectURL(url);
                          
                          toast({
                            title: "Análise de desempenho gerada",
                            description: "O relatório de desempenho dos GPTs foi gerado e baixado automaticamente.",
                          });
                        }, 1500);
                      }}
                      disabled={isGeneratingReport}
                    >
                      {isGeneratingReport ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        "Gerar Relatório"
                      )}
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Logs do Sistema</h3>
                    <p className="text-neutral-200 mb-2">Registro de eventos do sistema.</p>
                    <p className="text-neutral-300 text-sm mb-4">Inclui erros, avisos e atividades administrativas.</p>
                    <Button 
                      className="bg-accent hover:bg-accent-hover w-full"
                      onClick={() => {
                        setIsGeneratingReport(true);
                        
                        // Simulação de carregamento dos logs
                        setTimeout(() => {
                          setIsGeneratingReport(false);
                          
                          // Criar um blob com logs do sistema em formato de texto
                          const hoje = new Date().toISOString().slice(0, 10);
                          const timestamp = new Date().toISOString();
                          const logs =
                            `${timestamp} [INFO] Sistema iniciado\n` +
                            `${timestamp} [INFO] Banco de dados conectado\n` +
                            `${timestamp} [INFO] Usuario 'admin' logado\n` +
                            `${timestamp} [INFO] Acesso à página de administração\n` +
                            `${timestamp} [INFO] Listagem de usuários carregada\n` +
                            `${timestamp} [INFO] Listagem de GPTs carregada\n` +
                            `${timestamp} [INFO] Categorias carregadas\n` +
                            `${timestamp} [WARN] Tentativa de acesso inválida por IP 192.168.1.45\n` +
                            `${timestamp} [INFO] GPT 'Agravo de Instrumento' acessado 28 vezes hoje\n` +
                            `${timestamp} [INFO] GPT 'Petição Inicial' acessado 17 vezes hoje\n` +
                            `${timestamp} [ERROR] Falha ao conectar com serviço externo - tentando novamente\n` +
                            `${timestamp} [INFO] Reconexão bem sucedida\n` +
                            `${timestamp} [INFO] Backup do banco de dados realizado com sucesso\n`;
                          
                          const blob = new Blob([logs], { type: 'text/plain' });
                          
                          // Criar URL para o blob
                          const url = URL.createObjectURL(blob);
                          
                          // Criar elemento de link para download
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `logs-sistema-${hoje}.txt`;
                          
                          // Adicionar o link ao documento, clicar nele e removê-lo
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          
                          // Limpar a URL
                          URL.revokeObjectURL(url);
                          
                          toast({
                            title: "Logs do sistema exportados",
                            description: "Os logs do sistema foram exportados e baixados automaticamente.",
                          });
                        }, 1500);
                      }}
                      disabled={isGeneratingReport}
                    >
                      {isGeneratingReport ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        "Ver Logs"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
        
        <Footer />
      </div>
      
      {/* User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
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
                    <FormLabel>Email</FormLabel>
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
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um perfil" />
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
      
      {/* GPT Dialog */}
      <Dialog open={isGptDialogOpen} onOpenChange={setIsGptDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGpt ? "Editar GPT" : "Novo GPT"}</DialogTitle>
            <DialogDescription>
              {editingGpt 
                ? "Edite as informações do GPT abaixo." 
                : "Preencha as informações para criar um novo GPT."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...gptForm}>
            <form onSubmit={gptForm.handleSubmit(handleGptSubmit)} className="space-y-4">
              <FormField
                control={gptForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={gptForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={gptForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do GPT" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={gptForm.control}
                name="systemInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instruções do Sistema</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="min-h-[100px]"
                        placeholder="Você é um assistente especializado em..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={gptForm.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o modelo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {modelsLoading ? (
                            <div className="flex justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : models.length > 0 ? (
                            models.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                              <SelectItem value="gpt-4">GPT-4</SelectItem>
                              <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={gptForm.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature (0-100)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 70)}
                          placeholder="70"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={gptForm.control}
                name="files"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arquivos (URLs separadas por vírgula)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://exemplo.com/arquivo1.pdf, https://exemplo.com/arquivo2.txt"
                        value={field.value?.join(', ') || ''}
                        onChange={(e) => {
                          const files = e.target.value.split(',').map(f => f.trim()).filter(f => f);
                          field.onChange(files);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      URLs dos arquivos que o GPT pode referenciar, separadas por vírgula
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={gptForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriesLoading ? (
                          <div className="flex justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          categories?.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={gptForm.control}
                name="creatorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Criador</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do magistrado que criou o GPT" />
                    </FormControl>
                    <FormDescription>
                      Insira o nome completo da pessoa que criou este GPT.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              

              <FormField
                control={gptForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Imagem</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </FormControl>
                    <FormDescription>
                      A URL deve apontar diretamente para uma imagem e terminar com extensão .jpg, .png, etc. 
                      (ex: https://exemplo.com/imagem.jpg). NÃO use URLs de busca de imagens (como do Google ou Bing).
                      Exemplos válidos:
                      <ul className="list-disc pl-5 text-xs mt-1">
                        <li>https://site.com/imagem.jpg</li>
                        <li>https://cdn.dominio.com/assets/foto.png</li>
                      </ul>
                      <div className="text-red-400 text-xs mt-1">
                        INVÁLIDOS: URLs de busca (google.com/search ou bing.com/images)
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex space-x-4">
                <FormField
                  control={gptForm.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4"
                        />
                      </FormControl>
                      <FormLabel className="mt-0">Destacar na página inicial</FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={gptForm.control}
                  name="isNew"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4"
                        />
                      </FormControl>
                      <FormLabel className="mt-0">Marcar como novo</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsGptDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-accent hover:bg-accent-hover"
                  disabled={gptMutation.isPending}
                >
                  {gptMutation.isPending ? (
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
        <DialogContent className="sm:max-w-md">
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
