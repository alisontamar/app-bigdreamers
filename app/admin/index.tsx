import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, RefreshControl, Linking } from 'react-native';
import { Plus, BookOpen, Building, Trash2, Pencil, Search, FileText, Download } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAllUsers } from '@/hooks/user/useAllUsers';
import { useAssignGems } from '@/hooks/user/useAssignGems';
import { useGemRequests } from '@/hooks/gem/useGemRequests';
import { useApproveGemRequest } from '@/hooks/gem/useApproveGemRequest';
import { useRejectGemRequest } from '@/hooks/gem/useRejectGemRequest';
import { useAllReports } from '@/hooks/report/useAllReports';
import { useCreateReport } from '@/hooks/report/useCreateReport';
import { useLearningModules } from '@/hooks/learning/useLearningModules';
import { useCreateLearningModule } from '@/hooks/learning/useCreateLearningModule';
import { useUpdateLearningModule } from '@/hooks/learning/useUpdateLearningModule';
import { useDeleteLearningModule } from '@/hooks/learning/useDeleteLearningModule';
import { useCompanies } from '@/hooks/company/useCompanies';
import { useCreateCompany } from '@/hooks/company/useCreateCompany';
import { useUpdateCompany } from '@/hooks/company/useUpdateCompany';
import { useUpdateCompanyTeamMembers } from '@/hooks/company/useUpdateCompanyTeamMembers';
import { useDeleteCompany } from '@/hooks/company/useDeleteCompany';
import { LearningModuleFormData } from '@/components/admin/courses/CourseForm';
import { Company } from '@/constants/mockCompanies';
import { User } from '@/types';
import { uploadCompanyImage, uploadReportReceiptImage } from '@/services/supabase/storageService';
import { InterestType } from '@/services/supabase/investmentService';
import { addLessonToLearningModule, deleteLessonsByModuleId, syncModuleLessons } from '@/services/supabase/learningService';
import { invalidateCache, CacheKeys } from '@/services/cache/cacheService';
import { notifyAllUsersCoursePublished, notifyAllUsersCompanyPublished } from '@/services/notifications/broadcastNotifications';
import { getUserById } from '@/services/supabase/userService';
import { createNotification } from '@/services/supabase/notificationDbService';
import { sendGemRequestNotification } from '@/services/notifications/notificationService';
import { GemRequest } from '@/constants/mockGemRequests';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminTabs from '@/components/admin/AdminTabs';
import UserListCard from '@/components/admin/users/UserListCard';
import AssignGemsModal from '@/components/admin/users/AssignGemsModal';
import GemRequestCard from '@/components/admin/gems/GemRequestCard';
import ConfirmApproveModal from '@/components/admin/gems/ConfirmApproveModal';
import ConfirmRejectModal from '@/components/admin/gems/ConfirmRejectModal';
import ReportForm, { ReportFormValues } from '@/components/admin/reports/ReportForm';
import CourseForm from '@/components/admin/courses/CourseForm';
import CompanyForm from '@/components/admin/companies/CompanyForm';

const AdminScreen = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const routeParams = useLocalSearchParams<{ assignGemsUserId?: string; tab?: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'courses' | 'companies' | 'reports' | 'requests'>('users');

  const { users, loading: usersLoading, refetch: refetchUsers } = useAllUsers();
  const { assign: assignGems, loading: assigning } = useAssignGems();

  const { requests: gemRequests, loading: gemRequestsLoading, refetch: refetchGemRequests } = useGemRequests();
  const { approve: approveGemRequest, loading: approvingGemRequest } = useApproveGemRequest();
  const { reject: rejectGemRequest, loading: rejectingGemRequest } = useRejectGemRequest();
  const pendingGemRequests = gemRequests.filter((r) => r.status === 'pending');

  const { reports, loading: reportsLoading, refetch: refetchReports } = useAllReports();
  const { create: createReport, loading: creatingReport } = useCreateReport();

  const { modules, loading: modulesLoading, refetch: refetchModules } = useLearningModules();
  const { create: createLearningModule, loading: creatingModule } = useCreateLearningModule();
  const { update: updateLearningModule } = useUpdateLearningModule();
  const { remove: deleteModule } = useDeleteLearningModule();

  const { companies, loading: companiesLoading, refetch: refetchCompanies } = useCompanies();
  const { create: createCompany, loading: creatingCompany } = useCreateCompany();
  const { update: updateCompany } = useUpdateCompany();
  const { updateTeamMembers } = useUpdateCompanyTeamMembers();
  const { remove: deleteCompany, loading: deletingCompany } = useDeleteCompany();

  const [userSearch, setUserSearch] = useState('');
  const [assigningToUser, setAssigningToUser] = useState<User | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<GemRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<GemRequest | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingModule, setEditingModule] = useState<{ id: string; data: LearningModuleFormData; lessons: { title: string; durationMinutes: number; content: string }[] } | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchUsers(), refetchModules(), refetchCompanies(), refetchReports(), refetchGemRequests()]); }
    finally { setRefreshing(false); }
  }, [refetchUsers, refetchModules, refetchCompanies, refetchReports, refetchGemRequests]);

  const bg          = isDark ? Colors.blue.primary : Colors.light.bg;
  const cardBg      = isDark ? 'rgba(255,255,255,0.05)' : Colors.light.card;
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const textPrimary = isDark ? Colors.text.primary      : Colors.light.textPrimary;
  const textMuted   = isDark ? 'rgba(255,255,255,0.6)'  : Colors.light.textMuted;

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleAssignGems = (u: User) => {
    setAssigningToUser(u);
    setShowAssignModal(true);
  };

  // Al venir desde "Contratos por vencer" (notificaciones), abre directo el
  // modal de asignar gemas para ese usuario.
  const handledAssignGemsParam = useRef<string | null>(null);
  useEffect(() => {
    const targetId = routeParams.assignGemsUserId;
    if (!targetId || targetId === handledAssignGemsParam.current) return;
    const target = users.find((u) => u.id === targetId);
    if (!target) return;

    handledAssignGemsParam.current = targetId;
    setActiveTab('users');
    handleAssignGems(target);
    router.setParams({ assignGemsUserId: undefined });
  }, [routeParams.assignGemsUserId, users, router]);

  // Al venir desde una notificación de "nueva solicitud de gemas", abre
  // directo la pestaña de Solicitudes.
  const handledTabParam = useRef<string | null>(null);
  useEffect(() => {
    const targetTab = routeParams.tab;
    if (!targetTab || targetTab === handledTabParam.current) return;
    handledTabParam.current = targetTab;
    if (targetTab === 'requests') setActiveTab('requests');
    router.setParams({ tab: undefined });
  }, [routeParams.tab, router]);

  const confirmAssignGems = async (params: {
    gems: number;
    contractStartDate: string;
    contractEndDate: string;
    interestType: InterestType;
    interestRate: number;
  }) => {
    if (!assigningToUser) return;
    try {
      await assignGems({ userId: assigningToUser.id, ...params });
      setShowAssignModal(false);
      setAssigningToUser(null);
      refetchUsers();
      Alert.alert('¡Listo!', `Se asignaron ${params.gems} gemas a ${assigningToUser.name}.`);
    } catch (error) {
      console.error('Error assigning gems:', error);
      Alert.alert('Error', 'No se pudieron asignar las gemas. Intenta nuevamente.');
    }
  };

  const handleApproveGemRequest = (id: string) => {
    const req = gemRequests.find((r) => r.id === id) ?? null;
    setApprovingRequest(req);
  };

  const handleRejectGemRequest = (id: string) => {
    const req = gemRequests.find((r) => r.id === id) ?? null;
    setRejectingRequest(req);
  };

  const confirmApproveGemRequest = async () => {
    if (!approvingRequest || !user?.id) return;
    const req = approvingRequest;
    try {
      await approveGemRequest(req.id, user.id);
      setApprovingRequest(null);
      refetchGemRequests();
      refetchUsers();

      try {
        await createNotification({
          userId: req.userId,
          type: 'gems_assigned',
          title: '💎 ¡Gemas asignadas!',
          body: `Tu solicitud de ${req.gems} gemas fue aprobada. Ya están disponibles en tu cuenta.`,
          data: { gems: req.gems, requestId: req.id },
        });
      } catch (e) {
        console.error('[GemRequest] No se pudo crear la notificación de aprobación:', e);
      }
      try {
        const requester = await getUserById(req.userId);
        if (requester?.pushToken) {
          await sendGemRequestNotification(requester.pushToken, 'approved', req.gems);
        }
      } catch (e) {
        console.error('[GemRequest] No se pudo enviar el push de aprobación:', e);
      }
    } catch (error) {
      console.error('Error approving gem request:', error);
      Alert.alert('Error', 'No se pudo aprobar la solicitud. Intenta nuevamente.');
    }
  };

  const confirmRejectGemRequest = async (reason?: string) => {
    if (!rejectingRequest) return;
    const req = rejectingRequest;
    try {
      await rejectGemRequest(req.id, reason);
      setRejectingRequest(null);
      refetchGemRequests();

      try {
        await createNotification({
          userId: req.userId,
          type: 'gem_request_rejected',
          title: '❌ Solicitud rechazada',
          body: reason
            ? `Tu solicitud de ${req.gems} gemas fue rechazada. Motivo: ${reason}`
            : `Tu solicitud de ${req.gems} gemas fue rechazada.`,
          data: { gems: req.gems, requestId: req.id, reason: reason ?? null },
        });
      } catch (e) {
        console.error('[GemRequest] No se pudo crear la notificación de rechazo:', e);
      }
      try {
        const requester = await getUserById(req.userId);
        if (requester?.pushToken) {
          await sendGemRequestNotification(requester.pushToken, 'rejected', req.gems, reason);
        }
      } catch (e) {
        console.error('[GemRequest] No se pudo enviar el push de rechazo:', e);
      }
    } catch (error) {
      console.error('Error rejecting gem request:', error);
      Alert.alert('Error', 'No se pudo rechazar la solicitud. Intenta nuevamente.');
    }
  };

  const handleCreateReport = async (values: ReportFormValues) => {
    if (!user?.id) return;
    try {
      let receiptImageUrl: string | undefined;
      if (values.receiptImageUri) {
        try {
          receiptImageUrl = await uploadReportReceiptImage(values.receiptImageUri);
        } catch (storageError: any) {
          const msg = storageError?.message || String(storageError);
          Alert.alert('Error de imagen', `No se pudo subir el comprobante:\n\n${msg}`);
          return;
        }
      }

      const { receiptImageUri, ...rest } = values;
      await createReport({ ...rest, receiptImageUrl, createdBy: user.id });
      setShowReportForm(false);
      refetchReports();
      Alert.alert('¡Reporte generado!', 'El PDF se creó y el usuario fue notificado.');
    } catch (error) {
      console.error('Error creating report:', error);
      Alert.alert('Error', 'No se pudo generar el reporte. Intenta nuevamente.');
    }
  };

  const handlePublishCourse = async (data: LearningModuleFormData) => {
    try {
      const createdModule = await createLearningModule(data);
      if (createdModule && data.lessons && data.lessons.length > 0) {
        for (const lesson of data.lessons) {
          await addLessonToLearningModule(createdModule.id, {
            title: lesson.title,
            durationMinutes: lesson.durationMinutes,
            content: lesson.content,
          });
        }
      }
      setShowCourseForm(false);
      setEditingModule(null);
      await invalidateCache(CacheKeys.learningModules);
      refetchModules();
      Alert.alert('¡Publicado!', 'El módulo se creó correctamente.');

      if (createdModule) {
        try {
          await notifyAllUsersCoursePublished(createdModule.id, createdModule.title);
        } catch (e) {
          console.error('No se pudo notificar el nuevo curso a los usuarios:', e);
        }
      }
    } catch (error) {
      console.error('Error creating learning module:', error);
      Alert.alert('Error', 'No se pudo crear el módulo. Verifica los datos e intenta nuevamente.');
    }
  };

  const handleUpdateCourse = async (id: string, data: LearningModuleFormData) => {
    try {
      await updateLearningModule(id, {
        title: data.title,
        description: data.description,
        category: data.category,
        duration: data.duration,
        gemsReward: data.gemsReward,
        thumbnail: data.thumbnail,
        difficulty: data.difficulty,
        orderIndex: data.orderIndex,
        isPremium: data.isPremium,
        gemsCost: data.gemsCost,
      });
      if (data.lessons) {
        // Preserva las lecciones sin cambios (y su created_at); solo inserta las
        // nuevas/cambiadas y borra las quitadas. Así editar NO reinicia el módulo
        // para quienes ya lo completaron: solo deben hacer la lección nueva/cambiada.
        await syncModuleLessons(id, data.lessons);
      }
      setShowCourseForm(false);
      setEditingModule(null);
      await invalidateCache(CacheKeys.learningModules);
      refetchModules();
      Alert.alert('¡Actualizado!', 'El módulo se actualizó correctamente.');
    } catch (error) {
      console.error('Error updating learning module:', error);
      Alert.alert('Error', 'No se pudo actualizar el módulo. Verifica los datos e intenta nuevamente.');
    }
  };

  const handleEditModule = async (mod: any) => {
    try {
      const supabase = (await import('@/services/supabase/supabase')).getSupabaseClient;
      const client = await supabase();
      const { data: lessons } = await client
        .from('lessons')
        .select('title, duration_minutes, content')
        .eq('module_id', mod.id)
        .order('created_at', { ascending: true });

      const lessonData = (lessons || []).map((l: any) => ({
        title: l.title,
        durationMinutes: l.duration_minutes,
        content: l.content ?? '',
      }));

      setEditingModule({
        id: mod.id,
        data: {
          title: mod.title || '',
          description: mod.description || '',
          category: mod.category || '',
          duration: mod.duration || '',
          gemsReward: mod.gemsReward || 0,
          thumbnail: mod.thumbnail || '',
          difficulty: mod.difficulty || 'beginner',
          orderIndex: mod.orderIndex,
          isPremium: mod.isPremium ?? false,
          gemsCost: mod.gemsCost ?? 0,
        },
        lessons: lessonData,
      });
      setShowCourseForm(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las lecciones del módulo.');
    }
  };

  const handleDeleteModule = (id: string, title: string) => {
    Alert.alert(
      'Eliminar módulo',
      `¿Seguro que quieres eliminar "${title}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            try {
              await deleteModule(id);
              await invalidateCache(CacheKeys.learningModules);
              refetchModules();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el módulo.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCompany = (id: string, name: string) => {
    Alert.alert(
      'Eliminar empresa',
      `¿Seguro que quieres eliminar "${name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            try {
              await deleteCompany(id);
              await invalidateCache(CacheKeys.companies);
              refetchCompanies();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la empresa.');
            }
          },
        },
      ]
    );
  };

  const handlePublishCompany = async (company: Partial<Company>) => {
    try {
      let imageUrl = company.imageUrl || '';
      if (imageUrl && !imageUrl.startsWith('http')) {
        try {
          imageUrl = await uploadCompanyImage(imageUrl);
        } catch (storageError: any) {
          const msg = storageError?.message || String(storageError);
          Alert.alert('Error de imagen', `No se pudo subir la imagen:\n\n${msg}`);
          return;
        }
      }
      const createdCompany = await createCompany({
        name: company.name || '',
        description: company.description || '',
        gems: company.gems || 0,
        imageUrl: imageUrl.startsWith('http') ? imageUrl : '',
        level: company.level || 'bronze',
        teamMembers: (company.teamMembers || []).map(m => ({
          name: m.name,
          role: m.role,
          contact: m.contact,
        })),
        published: true,
      });
      setShowCompanyForm(false);
      setEditingCompany(null);
      refetchCompanies();
      Alert.alert('¡Publicado!', 'La empresa se creó correctamente.');

      if (createdCompany) {
        try {
          await notifyAllUsersCompanyPublished(createdCompany.id, createdCompany.name);
        } catch (e) {
          console.error('No se pudo notificar la nueva empresa a los usuarios:', e);
        }
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      Alert.alert('Error', `No se pudo crear la empresa:\n\n${msg}`);
    }
  };

  const handleUpdateCompany = async (id: string, company: Partial<Company>) => {
    try {
      let imageUrl = company.imageUrl || '';
      if (imageUrl && !imageUrl.startsWith('http')) {
        try {
          imageUrl = await uploadCompanyImage(imageUrl);
        } catch (storageError: any) {
          const msg = storageError?.message || String(storageError);
          Alert.alert('Error de imagen', `No se pudo subir la imagen:\n\n${msg}`);
          return;
        }
      }
      await updateCompany(id, {
        name: company.name,
        description: company.description,
        gems: company.gems,
        imageUrl: imageUrl.startsWith('http') ? imageUrl : company.imageUrl,
        level: company.level,
      });
      if (company.teamMembers && company.teamMembers.length > 0) {
        await updateTeamMembers(
          id,
          company.teamMembers.map(m => ({ name: m.name, role: m.role, contact: m.contact }))
        );
      }
      setShowCompanyForm(false);
      setEditingCompany(null);
      refetchCompanies();
      Alert.alert('¡Actualizado!', 'La empresa se actualizó correctamente.');
    } catch (error: any) {
      const msg = error?.message || String(error);
      Alert.alert('Error', `No se pudo actualizar la empresa:\n\n${msg}`);
    }
  };

  if (showCourseForm) {
    return (
      <CourseForm
        onPublish={handlePublishCourse}
        onUpdate={handleUpdateCourse}
        onCancel={() => { setShowCourseForm(false); setEditingModule(null); }}
        initialData={editingModule ? { ...editingModule.data, id: editingModule.id } : null}
        initialLessons={editingModule?.lessons}
      />
    );
  }

  if (showCompanyForm) {
    return (
      <CompanyForm
        onPublish={handlePublishCompany}
        onUpdate={handleUpdateCompany}
        onCancel={() => { setShowCompanyForm(false); setEditingCompany(null); }}
        initialData={editingCompany}
      />
    );
  }

  if (showReportForm) {
    return (
      <ReportForm
        users={users}
        onSubmit={handleCreateReport}
        onCancel={() => setShowReportForm(false)}
        submitting={creatingReport}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bg }} edges={['bottom']}>
      <AdminHeader />
      <AdminTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
        pendingRequestsCount={pendingGemRequests.length}
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? Colors.gold[400] : Colors.light.accent}
            colors={[isDark ? Colors.gold[400] : Colors.light.accent]}
          />
        }
      >
        {/* ─── Usuarios ─── */}
        {activeTab === 'users' && (
          <View>
            <Text className="text-[17px] font-bold mb-3 mt-2" style={{ color: textPrimary }}>
              Usuarios ({users.length})
            </Text>

            <View
              className="flex-row items-center rounded-xl px-3 mb-4"
              style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}
            >
              <Search size={16} color={textMuted} />
              <TextInput
                placeholder="Buscar por nombre o correo"
                placeholderTextColor={textMuted}
                value={userSearch}
                onChangeText={setUserSearch}
                className="flex-1 py-3 px-2 text-[14px]"
                style={{ color: textPrimary }}
              />
            </View>

            {usersLoading ? (
              <View className="items-center justify-center py-12">
                <Text style={{ color: textMuted }}>Cargando usuarios...</Text>
              </View>
            ) : filteredUsers.length === 0 ? (
              <View
                className="items-center justify-center py-12 rounded-2xl"
                style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}
              >
                <Text className="text-[15px] font-semibold text-center" style={{ color: textMuted }}>
                  No se encontraron usuarios
                </Text>
              </View>
            ) : (
              <View>
                {filteredUsers.map((u) => (
                  <UserListCard
                    key={u.id}
                    user={u}
                    onAssignGems={handleAssignGems}
                    isDark={isDark}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── Solicitudes de gemas ─── */}
        {activeTab === 'requests' && (
          <View>
            <Text className="text-[17px] font-bold mb-3 mt-2" style={{ color: textPrimary }}>
              Solicitudes de gemas ({gemRequests.length})
            </Text>

            {gemRequestsLoading ? (
              <View className="items-center justify-center py-12">
                <Text style={{ color: textMuted }}>Cargando solicitudes...</Text>
              </View>
            ) : gemRequests.length === 0 ? (
              <View
                className="items-center justify-center py-12 rounded-2xl"
                style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}
              >
                <Text className="text-[15px] font-semibold text-center" style={{ color: textMuted }}>
                  No hay solicitudes de gemas
                </Text>
              </View>
            ) : (
              <View>
                {gemRequests.map((req) => (
                  <GemRequestCard
                    key={req.id}
                    request={req}
                    onApprove={handleApproveGemRequest}
                    onReject={handleRejectGemRequest}
                    isDark={isDark}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── Cursos ─── */}
        {activeTab === 'courses' && (
          <View>
            <Pressable
              onPress={() => { setEditingModule(null); setShowCourseForm(true); }}
              className="flex-row items-center justify-center rounded-2xl py-4 mb-5 mt-2 gap-2"
              style={{ backgroundColor: Colors.gold[400] }}
            >
              <Plus size={18} color="#000" />
              <Text className="text-[15px] font-extrabold" style={{ color: '#000' }}>
                Nuevo módulo
              </Text>
            </Pressable>

            {modulesLoading ? (
              <View className="items-center justify-center py-12">
                <Text style={{ color: textMuted }}>Cargando módulos...</Text>
              </View>
            ) : modules.length === 0 ? (
              <View
                className="items-center justify-center py-12 rounded-2xl"
                style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}
              >
                <BookOpen size={40} color={textMuted} />
                <Text className="text-[15px] font-semibold text-center mt-3" style={{ color: textMuted }}>
                  No hay módulos publicados
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {modules.map((mod) => (
                  <View
                    key={mod.id}
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <Text
                        className="text-[15px] font-bold flex-1 mr-3"
                        style={{ color: textPrimary }}
                        numberOfLines={1}
                      >
                        {mod.title}
                      </Text>
                        <View className="flex-row items-center gap-2">
                          <View
                            className="rounded-full px-2.5 py-1"
                            style={{ backgroundColor: Colors.gold[400] }}
                          >
                            <Text className="text-[10px] font-extrabold" style={{ color: '#000' }}>
                              PUBLICADO
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => handleEditModule(mod)}
                            className="w-8 h-8 rounded-xl items-center justify-center active:opacity-60"
                            style={{ backgroundColor: isDark ? 'rgba(255,215,64,0.12)' : Colors.light.goldLight }}
                          >
                            <Pencil size={15} color={Colors.gold[500]} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteModule(mod.id, mod.title)}
                            className="w-8 h-8 rounded-xl items-center justify-center active:opacity-60"
                            style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : Colors.light.errorBg }}
                          >
                            <Trash2 size={15} color={Colors.error} />
                          </Pressable>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-xs" style={{ color: textMuted }}>
                        {mod.category}
                      </Text>
                      <View
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: textMuted }}
                      />
                      <Text className="text-xs capitalize" style={{ color: textMuted }}>
                        {mod.difficulty}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── Empresas ─── */}
        {activeTab === 'companies' && (
          <View>
            <Pressable
              onPress={() => { setEditingCompany(null); setShowCompanyForm(true); }}
              className="flex-row items-center justify-center rounded-2xl py-4 mb-5 mt-2 gap-2"
              style={{ backgroundColor: Colors.gold[400] }}
            >
              <Plus size={18} color="#000" />
              <Text className="text-[15px] font-extrabold" style={{ color: '#000' }}>
                Nueva empresa
              </Text>
            </Pressable>

            {companiesLoading ? (
              <View className="items-center justify-center py-12">
                <Text style={{ color: textMuted }}>Cargando empresas...</Text>
              </View>
            ) : companies.length === 0 ? (
              <View
                className="items-center justify-center py-12 rounded-2xl"
                style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}
              >
                <Building size={40} color={textMuted} />
                <Text className="text-[15px] font-semibold text-center mt-3" style={{ color: textMuted }}>
                  No hay empresas publicadas
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {companies.map((company) => {
                  const levelColor =
                    company.level === 'gold'   ? Colors.levels.gold   :
                    company.level === 'silver' ? Colors.levels.silver : Colors.levels.bronze;

                  return (
                    <View
                      key={company.id}
                      className="rounded-2xl p-4"
                      style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}
                    >
                      <View className="flex-row justify-between items-center mb-1">
                        <Text
                          className="text-[15px] font-bold flex-1 mr-3"
                          style={{ color: textPrimary }}
                          numberOfLines={1}
                        >
                          {company.name}
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <View
                            className="rounded-full px-2.5 py-1"
                            style={{ backgroundColor: `${levelColor}22` }}
                          >
                            <Text
                              className="text-[10px] font-extrabold uppercase"
                              style={{ color: levelColor }}
                            >
                              {company.level}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => { setEditingCompany(company); setShowCompanyForm(true); }}
                            className="w-8 h-8 rounded-xl items-center justify-center active:opacity-60"
                            style={{ backgroundColor: isDark ? 'rgba(255,215,64,0.12)' : Colors.light.goldLight }}
                          >
                            <Pencil size={15} color={Colors.gold[500]} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteCompany(company.id, company.name)}
                            className="w-8 h-8 rounded-xl items-center justify-center active:opacity-60"
                            style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : Colors.light.errorBg }}
                          >
                            <Trash2 size={15} color={Colors.error} />
                          </Pressable>
                        </View>
                      </View>
                      <Text className="text-xs" style={{ color: textMuted }}>
                        {company.gems.toLocaleString()} gemas
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ─── Reportes ─── */}
        {activeTab === 'reports' && (
          <View>
            <Pressable
              onPress={() => setShowReportForm(true)}
              className="flex-row items-center justify-center rounded-2xl py-4 mb-5 mt-2 gap-2"
              style={{ backgroundColor: Colors.gold[400] }}
            >
              <Plus size={18} color="#000" />
              <Text className="text-[15px] font-extrabold" style={{ color: '#000' }}>
                Nuevo reporte
              </Text>
            </Pressable>

            {reportsLoading ? (
              <View className="items-center justify-center py-12">
                <Text style={{ color: textMuted }}>Cargando reportes...</Text>
              </View>
            ) : reports.length === 0 ? (
              <View
                className="items-center justify-center py-12 rounded-2xl"
                style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}
              >
                <FileText size={40} color={textMuted} />
                <Text className="text-[15px] font-semibold text-center mt-3" style={{ color: textMuted }}>
                  No hay reportes generados
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {reports.map((report) => (
                  <View
                    key={report.id}
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}
                  >
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className="text-[15px] font-bold flex-1 mr-3" style={{ color: textPrimary }} numberOfLines={1}>
                        {report.investorName}
                      </Text>
                      <Pressable
                        onPress={() => Linking.openURL(report.pdfUrl)}
                        className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: isDark ? 'rgba(255,215,64,0.12)' : Colors.light.goldLight }}
                      >
                        <Download size={13} color={Colors.gold[500]} />
                        <Text className="text-xs font-bold" style={{ color: Colors.gold[500] }}>PDF</Text>
                      </Pressable>
                    </View>
                    <Text className="text-xs" style={{ color: textMuted }}>
                      {report.companyName ? `${report.companyName} · ` : ''}{report.reportDate}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <AssignGemsModal
        visible={showAssignModal}
        user={assigningToUser}
        onConfirm={confirmAssignGems}
        onCancel={() => { setShowAssignModal(false); setAssigningToUser(null); }}
        isDark={isDark}
        submitting={assigning}
      />

      <ConfirmApproveModal
        visible={!!approvingRequest}
        request={approvingRequest}
        onConfirm={confirmApproveGemRequest}
        onCancel={() => setApprovingRequest(null)}
        isDark={isDark}
      />

      <ConfirmRejectModal
        visible={!!rejectingRequest}
        request={rejectingRequest}
        onConfirm={confirmRejectGemRequest}
        onCancel={() => setRejectingRequest(null)}
        isDark={isDark}
      />
    </SafeAreaView>
  );
};

export default AdminScreen;
