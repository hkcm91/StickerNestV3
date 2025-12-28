/**
 * StickerNest v2 - Template Library
 * Browse and select widget templates by category
 *
 * Updated with new design system: SNIcon, glass effects
 */

import React, { useState, useMemo } from 'react';
import {
  WIDGET_TEMPLATES,
  type WidgetTemplate,
  type TemplateCategory,
  getTemplatesByCategory,
} from '../../ai/WidgetTemplates';
import { SNIcon, IconName } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';

export interface TemplateLibraryProps {
  onSelectTemplate: (template: WidgetTemplate) => void;
  onPreviewTemplate: (template: WidgetTemplate) => void;
}

const CATEGORY_INFO: Record<TemplateCategory, { icon: IconName; label: string; description: string }> = {
  'data-display': {
    icon: 'analytics',
    label: 'Display',
    description: 'Show data, text, and information'
  },
  'input': {
    icon: 'edit',
    label: 'Input',
    description: 'Forms, buttons, and user input'
  },
  'communication': {
    icon: 'chat',
    label: 'Communication',
    description: 'Messaging and notifications'
  },
  'pipeline': {
    icon: 'link',
    label: 'Pipeline',
    description: 'Data transformation and flow'
  },
  'utility': {
    icon: 'wrench',
    label: 'Utility',
    description: 'Helper and tool widgets'
  },
  'visualization': {
    icon: 'chart',
    label: 'Visualization',
    description: 'Charts and visual data'
  },
};

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onSelectTemplate,
  onPreviewTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = selectedCategory === 'all' 
      ? WIDGET_TEMPLATES 
      : getTemplatesByCategory(selectedCategory);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.examples.some(e => e.toLowerCase().includes(query))
      );
    }
    
    return templates;
  }, [selectedCategory, searchQuery]);

  // Get template counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: WIDGET_TEMPLATES.length };
    for (const cat of Object.keys(CATEGORY_INFO) as TemplateCategory[]) {
      counts[cat] = getTemplatesByCategory(cat).length;
    }
    return counts;
  }, []);

  const handleTemplateClick = (template: WidgetTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = (template: WidgetTemplate) => {
    onSelectTemplate(template);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 8,
        borderBottom: '1px solid var(--sn-border-primary, rgba(255,255,255,0.1))',
      }}>
        <h4 style={{ margin: 0, color: 'var(--sn-text-primary, #e2e8f0)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <SNIcon name="library" size="sm" />
          Template Library
        </h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--sn-text-tertiary, #64748b)' }}>
          {WIDGET_TEMPLATES.length} templates
        </span>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search templates..."
        style={{
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          color: '#e2e8f0',
          fontSize: '0.85rem',
        }}
      />

      {/* Category Pills */}
      <div style={{ 
        display: 'flex', 
        gap: 6, 
        flexWrap: 'wrap',
        paddingBottom: 8,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '4px 10px',
            background: selectedCategory === 'all' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
            border: selectedCategory === 'all' ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent',
            borderRadius: 12,
            color: selectedCategory === 'all' ? '#e2e8f0' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          All ({categoryCounts.all})
        </button>
        {(Object.entries(CATEGORY_INFO) as [TemplateCategory, typeof CATEGORY_INFO[TemplateCategory]][]).map(
          ([cat, info]) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              title={info.description}
              style={{
                padding: '4px 10px',
                background: selectedCategory === cat ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                border: selectedCategory === cat ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent',
                borderRadius: 12,
                color: selectedCategory === cat ? 'var(--sn-text-primary, #e2e8f0)' : 'var(--sn-text-secondary, #94a3b8)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <SNIcon name={info.icon} size="xs" /> {info.label} ({categoryCounts[cat]})
            </button>
          )
        )}
      </div>

      {/* Template Grid */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {filteredTemplates.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 20,
            color: 'var(--sn-text-tertiary, #64748b)',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: 8, opacity: 0.6 }}>
              <SNIcon name="search" size="2xl" />
            </div>
            <span style={{ fontSize: '0.85rem' }}>No templates found</span>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              onClick={() => handleTemplateClick(template)}
              style={{
                padding: 12,
                background: selectedTemplate?.id === template.id 
                  ? 'rgba(139, 92, 246, 0.15)' 
                  : 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                cursor: 'pointer',
                border: selectedTemplate?.id === template.id
                  ? '1px solid rgba(139, 92, 246, 0.4)'
                  : '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ display: 'flex', color: 'var(--sn-accent-primary, #8b5cf6)' }}>
                  <SNIcon name={CATEGORY_INFO[template.category]?.icon || 'widget'} size="md" />
                </span>
                <span style={{ color: 'var(--sn-text-primary, #e2e8f0)', fontSize: '0.85rem', fontWeight: 500 }}>
                  {template.name}
                </span>
              </div>
              
              <p style={{ 
                margin: '0 0 8px 0', 
                fontSize: '0.75rem', 
                color: '#94a3b8',
                lineHeight: 1.4,
              }}>
                {template.description}
              </p>

              {/* Examples */}
              {template.examples.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  gap: 4, 
                  flexWrap: 'wrap', 
                  marginBottom: 8 
                }}>
                  {template.examples.slice(0, 2).map((example, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 4,
                        color: '#64748b',
                      }}
                    >
                      {example}
                    </span>
                  ))}
                </div>
              )}

              {/* Variables */}
              {template.variables.length > 0 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--sn-text-tertiary, #64748b)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <SNIcon name="sliders" size="xs" />
                  {template.variables.length} customizable variable{template.variables.length > 1 ? 's' : ''}
                </div>
              )}

              {/* Actions */}
              {selectedTemplate?.id === template.id && (
                <div style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid var(--sn-border-primary, rgba(255,255,255,0.1))',
                }}>
                  <SNButton
                    variant="gradient"
                    size="sm"
                    leftIcon="wand"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(template);
                    }}
                    style={{ flex: 1 }}
                  >
                    Use Template
                  </SNButton>
                  <SNButton
                    variant="glass"
                    size="sm"
                    leftIcon="eye"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewTemplate(template);
                    }}
                  >
                    Preview
                  </SNButton>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TemplateLibrary;

