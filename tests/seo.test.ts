import {describe,expect,it} from 'vitest';
import {getText,homeContent,localePath,locales,toolContent} from '../src/lib/i18n';
import {createPageSeo,type PageSeoInput} from '../src/lib/seo';

const common:PageSeoInput={site:'https://pdfeditgo.com',locale:'en',title:'PDF tools',description:'Browser-local PDF tools'};
describe('page metadata describes the actual document',()=>{
  it.each(locales)('%s homepage has broad, distinct content and clean language URLs',locale=>{
    const home=homeContent(locale);const word=toolContent(locale,'word-to-pdf');
    expect(home.title).not.toBe(word.title);expect(home.description).not.toBe(word.description);
    expect(home.faqs).not.toEqual(word.faqs);expect(home.steps).not.toEqual(word.steps);
    const seo=createPageSeo({...common,locale,title:home.title,description:home.description});
    expect(seo.canonical).toBe(new URL(localePath(locale),'https://pdfeditgo.com').href);
    expect(seo.alternates).toHaveLength(5);
    expect(seo.image).toBe('https://pdfeditgo.com/social-card.png');
    expect(seo.structuredData?.['@graph'].map(node=>node['@type']).sort()).toEqual(['WebPage','WebSite']);
  });
  it('connects the visible tool, localized breadcrumbs and web page without fake review data',()=>{
    const content=toolContent('ko','merge-pdf');
    const seo=createPageSeo({...common,locale:'ko',route:'merge-pdf',tool:'merge-pdf',title:content.title,description:content.description,features:content.features});
    const nodes=seo.structuredData!['@graph'];
    const application=nodes.find(node=>node['@type']==='WebApplication')!;
    const page=nodes.find(node=>node['@type']==='WebPage')!;
    const crumb=nodes.find(node=>node['@type']==='BreadcrumbList')!;
    expect(application.name).toBe(getText('ko').tools['merge-pdf'].name);
    expect(application.featureList).toEqual(content.features);
    expect(application.url).toBe(seo.canonical);
    expect(page.mainEntity).toEqual({'@id':application['@id']});
    expect(crumb.itemListElement).toEqual([
      {'@type':'ListItem',position:1,name:getText('ko').homeLabel,item:'https://pdfeditgo.com/ko/'},
      {'@type':'ListItem',position:2,name:getText('ko').tools['merge-pdf'].name,item:'https://pdfeditgo.com/ko/merge-pdf/'},
    ]);
    expect(JSON.stringify(nodes)).not.toMatch(/aggregateRating|reviewCount|SearchAction/);
  });
  it('keeps legal pages separate from conversion applications',()=>{
    const seo=createPageSeo({...common,route:'privacy',pageLabel:'Privacy'});
    expect(seo.structuredData?.['@graph'].some(node=>node['@type']==='WebApplication')).toBe(false);
    expect(seo.structuredData?.['@graph'].some(node=>node['@type']==='BreadcrumbList')).toBe(true);
  });
  it('excludes error pages from indexing and never canonicalizes a 404 to home',()=>{
    const seo=createPageSeo({...common,route:'404'});
    expect(seo.robots).toBe('noindex, follow');expect(seo.canonical).toBeUndefined();
    expect(seo.alternates).toEqual([]);expect(seo.structuredData).toBeUndefined();
  });
  it('does not promote an unconfigured contact page into the search index',()=>{
    const missing=createPageSeo({...common,route:'contact'});
    expect(missing.indexable).toBe(false);expect(missing.canonical).toBe('https://pdfeditgo.com/contact/');
    expect(missing.alternates).toEqual([]);expect(missing.structuredData).toBeUndefined();
    const configured=createPageSeo({...common,route:'contact',contactEmail:'owner@example.test'});
    expect(configured.indexable).toBe(true);expect(configured.alternates).toHaveLength(5);
  });
  it('does not invent a public host for an unconfigured local checkout',()=>{
    const seo=createPageSeo({...common,site:undefined});
    expect(seo.canonical).toBeUndefined();expect(seo.image).toBeUndefined();
    expect(seo.alternates).toEqual([]);expect(seo.structuredData).toBeUndefined();
  });
  it('preserves a project subpath across metadata and structured data',()=>{
    const seo=createPageSeo({...common,site:'https://oreoo1224.github.io',base:'/pdf-local/',route:'merge-pdf',tool:'merge-pdf'});
    expect(seo.canonical).toBe('https://oreoo1224.github.io/pdf-local/merge-pdf/');
    expect(seo.image).toBe('https://oreoo1224.github.io/pdf-local/social-card.png');
    for(const alternate of seo.alternates)expect(alternate.href).toContain('/pdf-local/');
    expect(JSON.stringify(seo.structuredData)).not.toContain('pdfeditgo.com');
  });
});
