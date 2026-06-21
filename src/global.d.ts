/// <reference types="svelte" />

declare module 'siyuan' {
  export interface Plugin {
    onload(): Promise<void> | void;
    onunload(): Promise<void> | void;
    addDock(config: {
      config: { position: string; size: { width: number; height: number }; icon: string; title: string };
      data: any;
      type: string;
      init: () => void;
      destroy: () => void;
      resize: () => void;
      update: () => void;
    }): void;
    addCommand(config: {
      langKey: string;
      hotkey: string;
      callback: () => void;
      editorCallback?: (protyle: any) => void;
    }): void;
    addIcons(svg: string): void;
    addTopBar(config: { icon: string; title: string; callback: (event: MouseEvent) => void }): HTMLElement;
    eventBus: {
      on(event: string, callback: (event: any) => void): void;
      off(event: string, callback: (event: any) => void): void;
    };
    protyleSlash: Array<{
      filter: string[];
      html: string;
      id: string;
      callback: (protyle: any) => void;
    }>;
    i18n: {
      [key: string]: Record<string, string>;
    };
  }

  export interface Protyle {
    hint: {
      extend: Array<{
        key: string;
        hint: (protyle: Protyle, text: string) => Promise<Array<{ html: string; text: string }>>;
      }>;
    };
    transaction(doOperations: any[], undoOperations?: any[]): void;
  }
}

declare module '*.svelte' {
  const component: any;
  export default component;
}

declare interface Window {
  siyuan: {
    config: {
      lang: string;
      system: any;
    };
    ws: {
      send(payload: any): void;
    };
  };
  Component: new (options: {
    target: HTMLElement;
    props?: Record<string, any>;
  }) => any;
}
