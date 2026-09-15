"use client";
import { AppShell } from '@/components/app-shell';
import { ClassicWorkspace } from '@/components/classic-workspace';
import { useAuth } from '@/components/auth-provider';
import { useLeague } from '@/components/league-provider';
export default function ClassicPage() {
  const { user } = useAuth();
  const { activeLeague } = useLeague();
  const key = `fantasta:classic:v1:${user?.id}:${activeLeague?.id}`;
  return <AppShell active="/classic">{user && activeLeague && <ClassicWorkspace key={key} storageKey={key} name={activeLeague.mode === 'classic' ? activeLeague.name : undefined} budget={activeLeague.mode === 'classic' ? activeLeague.budget : 500}/>}</AppShell>;
}
