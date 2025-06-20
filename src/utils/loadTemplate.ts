export const loadTemplateFiles = async (templateId: number) => {
  try {
    const [htmlRes, cssRes, jsRes] = await Promise.all([
      fetch(`/template/template${templateId}/index.html`),
      fetch(`/template/template${templateId}/style.css`),
      fetch(`/template/template${templateId}/index.js`)
    ]);

    if (!htmlRes.ok || !cssRes.ok || !jsRes.ok) {
      throw new Error('Failed to load template files');
    }

    return {
      html: await htmlRes.text(),
      css: await cssRes.text(),
      js: await jsRes.text()
    };
  } catch (error) {
    console.error('Error loading template:', error);
    return null;
  }
};
