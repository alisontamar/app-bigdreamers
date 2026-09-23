import { View, Text, Pressable, ScrollView } from 'react-native';
import { Users, BookOpen, Building2, FileText, Gem } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface AdminTabsProps {
  activeTab: 'users' | 'courses' | 'companies' | 'reports' | 'requests';
  onTabChange: (tab: 'users' | 'courses' | 'companies' | 'reports' | 'requests') => void;
  isDark: boolean;
  pendingRequestsCount?: number;
}

const AdminTabs = ({ activeTab, onTabChange, isDark, pendingRequestsCount = 0 }: AdminTabsProps) => {
  const textMuted = isDark ? 'rgba(255,255,255,0.65)' : Colors.light.textMuted;

  const tabs = [
    { key: 'users', label: 'Usuarios', icon: Users },
    { key: 'requests', label: 'Solicitudes', icon: Gem },
    { key: 'courses', label: 'Cursos', icon: BookOpen },
    { key: 'companies', label: 'Empresas', icon: Building2 },
    { key: 'reports', label: 'Reportes', icon: FileText },
  ] as const;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20 }}
      className="mb-4"
      style={{ flexGrow: 0 }}
    >
      <View className="flex-row gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              className="flex-row items-center px-4 py-2 rounded-full"
              style={{
                backgroundColor: isActive
                  ? Colors.gold[400]
                  : isDark ? 'rgba(0,0,0,0.25)' : Colors.light.surface,
                borderWidth: isActive ? 0 : 1,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              }}
            >
              <Icon size={16} color={isActive ? '#000' : textMuted} />
              <Text className="ml-2 font-semibold" style={{ color: isActive ? '#000' : textMuted }}>
                {tab.label}
              </Text>
              {tab.key === 'requests' && pendingRequestsCount > 0 && (
                <View
                  className="ml-1.5 rounded-full px-1.5 py-0.5 items-center justify-center"
                  style={{ backgroundColor: isActive ? '#000' : '#FF6B6B', minWidth: 18 }}
                >
                  <Text className="text-[10px] font-extrabold text-center" style={{ color: '#fff' }}>
                    {pendingRequestsCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};

export default AdminTabs;
