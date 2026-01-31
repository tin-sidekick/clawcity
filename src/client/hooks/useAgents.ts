import { useWorldStore } from '../stores/worldStore';

export function useAgents() {
  const agents = useWorldStore((s) => s.agents);
  const selectedAgent = useWorldStore((s) => s.selectedAgent);
  const setSelectedAgent = useWorldStore((s) => s.setSelectedAgent);

  const selected = selectedAgent ? agents.find((a) => a.id === selectedAgent) : null;

  return { agents, selectedAgent, selected, setSelectedAgent };
}
