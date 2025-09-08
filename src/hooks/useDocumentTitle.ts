import { useEffect } from 'react';

export const useDocumentTitle = (title: string, defaultTitle?: string) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title || defaultTitle || 'Dentaloria';
    
    return () => {
      document.title = previousTitle;
    };
  }, [title, defaultTitle]);
};