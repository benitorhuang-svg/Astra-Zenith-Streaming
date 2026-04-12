import { PortalContext } from '../../PortalTypes';

/**
 * NavigationHandler ??Handles Mode Switching (Chat, Decision Tree, Archive, etc.)
 */
export class NavigationHandler {
    constructor(private context: PortalContext) {}

    public handle(e: Event, find: (selector: string) => HTMLElement | undefined): boolean {
        // Navigation - Intercept and Prevent Default
        const chatTab = find('#h-btn-chat');
        if (chatTab) { 
            e.preventDefault(); 
            this.context._p.handleModeSwitch('chat'); 
            return true; 
        }
        
        const pathTab = find('#h-btn-pathway');
        if (pathTab) { 
            e.preventDefault(); 
            this.context._p.handleModeSwitch('decision-tree'); 
            return true; 
        }
        
        const archTab = find('#h-btn-archive');
        if (archTab) { 
            e.preventDefault(); 
            this.context._p.handleModeSwitch('archive'); 
            return true; 
        }
        
        const logTab = find('#h-btn-realtime'); 
        if (logTab) { 
            e.preventDefault(); 
            this.context._p.handleModeSwitch('logs'); 
            return true; 
        }
        
        const flowTab = find('#h-btn-custom-flow'); 
        if (flowTab) { 
            e.preventDefault(); 
            this.context._p.handleModeSwitch('table'); 
            return true; 
        }

        return false;
    }
}
