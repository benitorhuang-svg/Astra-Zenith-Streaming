import { PortalContext } from '../../PortalTypes';

/**
 * TopologyHandler ??Handles Neural Topology Switch logic
 */
export class TopologyHandler {
    constructor(private context: PortalContext) {}

    public handle(e: Event, find: (selector: string) => HTMLElement | undefined): boolean {
        // Topology - (Footer & Sidebar)
        if (find('#u-topology-linear')) { 
            e.preventDefault(); 
            this.context._p.handleTopologySwitch('linear'); 
            return true; 
        }
        if (find('#u-topology-orbital')) { 
            e.preventDefault(); 
            this.context._p.handleTopologySwitch('orbital'); 
            return true; 
        }
        if (find('#u-topology-custom')) { 
            e.preventDefault(); 
            this.context._p.handleTopologySwitch('custom'); 
            return true; 
        }
        
        // Sidebar Circular Toggle
        if (find('#u-sidebar-topology-icon')) {
            e.preventDefault();
            const current = this.context.currentTopology;
            const next: Record<string, 'linear' | 'orbital' | 'custom'> = {
                'linear': 'orbital',
                'orbital': 'custom',
                'custom': 'linear'
            };
            this.context._p.handleTopologySwitch(next[current] || 'linear');
            return true;
        }

        return false;
    }
}
