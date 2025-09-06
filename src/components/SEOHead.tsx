import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  structuredData?: object;
}

export const SEOHead = ({
  title = 'Atacado Canoa - Moda Infantil e Adulto',
  description = 'Atacado de roupas infantis e adultas com as melhores marcas e preços. Compre online com segurança e entrega rápida.',
  keywords = 'atacado, roupas infantis, moda adulto, roupas bebê, vestidos, camisetas',
  image = '/logo.png',
  url = window.location.href,
  type = 'website',
  structuredData
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper function to update or create meta tags
    const updateMetaTag = (property: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${property}"]` : `meta[name="${property}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (isProperty) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
      }
      
      meta.content = content;
    };

    // Update or create link tags
    const updateLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      
      link.href = href;
    };

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('author', 'Atacado Canoa');
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Open Graph meta tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:site_name', 'Atacado Canoa', true);

    // Twitter Card meta tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Canonical URL
    updateLinkTag('canonical', url);

    // Structured data
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      
      script.textContent = JSON.stringify(structuredData);
    }

    // Cleanup function
    return () => {
      // Clean up is handled by the next useEffect call
    };
  }, [title, description, keywords, image, url, type, structuredData]);

  return null;
};

// Hook for generating structured data
export const useStructuredData = () => {
  const generateOrganizationData = () => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Atacado Canoa",
    "url": window.location.origin,
    "logo": `${window.location.origin}/logo.png`,
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service"
    }
  });

  const generateProductData = (product: any) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": product.image,
    "brand": {
      "@type": "Brand",
      "name": "Atacado Canoa"
    },
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "BRL",
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  });

  const generateBreadcrumbData = (breadcrumbs: Array<{ name: string; url: string }>) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((breadcrumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": breadcrumb.name,
      "item": breadcrumb.url
    }))
  });

  return {
    generateOrganizationData,
    generateProductData,
    generateBreadcrumbData
  };
};