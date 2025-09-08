import { useEffect } from 'react';

interface MetaOptions {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}

export const useHeadMeta = (options: MetaOptions) => {
  useEffect(() => {
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let metaTag = document.querySelector(selector) as HTMLMetaElement;
      
      if (!metaTag) {
        metaTag = document.createElement('meta');
        if (property) {
          metaTag.setAttribute('property', name);
        } else {
          metaTag.setAttribute('name', name);
        }
        document.head.appendChild(metaTag);
      }
      
      metaTag.content = content;
    };

    if (options.title) {
      document.title = options.title;
    }
    
    if (options.description) {
      updateMetaTag('description', options.description);
    }
    
    if (options.ogTitle) {
      updateMetaTag('og:title', options.ogTitle, true);
    }
    
    if (options.ogDescription) {
      updateMetaTag('og:description', options.ogDescription, true);
    }
    
    if (options.ogImage) {
      updateMetaTag('og:image', options.ogImage, true);
    }
    
    if (options.twitterTitle) {
      updateMetaTag('twitter:title', options.twitterTitle);
    }
    
    if (options.twitterDescription) {
      updateMetaTag('twitter:description', options.twitterDescription);
    }
  }, [options]);
};