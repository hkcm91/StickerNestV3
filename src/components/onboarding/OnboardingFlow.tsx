/**
 * StickerNest v2 - Onboarding Flow
 *
 * Multi-step wizard for new user setup
 * Steps: Welcome, Profile, Interests, First Canvas
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import { userApi, canvasApi, templatesApi, CanvasTemplate } from '../../services/apiClient';
import { useToast } from '../../shared-ui';

// =============================================================================
// Types
// =============================================================================

type OnboardingStep = 'welcome' | 'profile' | 'interests' | 'template' | 'complete';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const INTEREST_OPTIONS = [
  { id: 'productivity', label: 'Productivity', icon: 'check-square' },
  { id: 'design', label: 'Design', icon: 'palette' },
  { id: 'development', label: 'Development', icon: 'code' },
  { id: 'education', label: 'Education', icon: 'book' },
  { id: 'gaming', label: 'Gaming', icon: 'gamepad' },
  { id: 'social', label: 'Social', icon: 'users' },
  { id: 'music', label: 'Music', icon: 'music' },
  { id: 'business', label: 'Business', icon: 'briefcase' },
];

// =============================================================================
// Component
// =============================================================================

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Interests state
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Template state
  const [templates, setTemplates] = useState<CanvasTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const steps: OnboardingStep[] = ['welcome', 'profile', 'interests', 'template', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const loadTemplates = async () => {
    try {
      const response = await templatesApi.list(undefined, 1, 6);
      if (response.success && response.data) {
        setTemplates(response.data.items);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleNext = async () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('profile');
        break;

      case 'profile':
        setLoading(true);
        try {
          // Save profile
          if (displayName || bio) {
            await userApi.updateProfile({ displayName, bio });
          }
          if (avatarFile) {
            await userApi.uploadAvatar(avatarFile);
          }
          setCurrentStep('interests');
        } catch (error) {
          toast.error('Failed to save profile');
        } finally {
          setLoading(false);
        }
        break;

      case 'interests':
        loadTemplates();
        setCurrentStep('template');
        break;

      case 'template':
        setLoading(true);
        try {
          if (selectedTemplate) {
            const response = await templatesApi.useTemplate(selectedTemplate, 'My First Canvas');
            if (response.success && response.data) {
              navigate(`/canvas/${response.data.canvas.id}`);
            }
          }
          setCurrentStep('complete');
        } catch (error) {
          toast.error('Failed to create canvas');
        } finally {
          setLoading(false);
        }
        break;

      case 'complete':
        onComplete();
        break;
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Progress */}
        <div style={styles.progress}>
          {steps.slice(0, -1).map((step, index) => (
            <div
              key={step}
              style={{
                ...styles.progressStep,
                ...(index <= currentStepIndex ? styles.progressStepActive : {}),
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div style={styles.stepContent}>
              <div style={styles.welcomeIcon}>
                <SNIcon name="sticker" size={48} color="#fff" />
              </div>
              <h1 style={styles.title}>Welcome to StickerNest!</h1>
              <p style={styles.description}>
                Create beautiful, interactive canvases with widgets. Let's get you set up in just a few steps.
              </p>
              <div style={styles.features}>
                <div style={styles.feature}>
                  <SNIcon name="layout" size={24} color="#8b5cf6" />
                  <span>Infinite Canvas</span>
                </div>
                <div style={styles.feature}>
                  <SNIcon name="box" size={24} color="#8b5cf6" />
                  <span>Drag & Drop Widgets</span>
                </div>
                <div style={styles.feature}>
                  <SNIcon name="share-2" size={24} color="#8b5cf6" />
                  <span>Share & Collaborate</span>
                </div>
              </div>
            </div>
          )}

          {/* Profile Step */}
          {currentStep === 'profile' && (
            <div style={styles.stepContent}>
              <h2 style={styles.stepTitle}>Set Up Your Profile</h2>
              <p style={styles.stepDescription}>
                Help others get to know you
              </p>

              <div style={styles.form}>
                <div style={styles.avatarSection}>
                  <div style={styles.avatarUpload}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="" style={styles.avatarPreviewImg} />
                    ) : (
                      <SNIcon name="user" size={32} color="#8b5cf6" />
                    )}
                  </div>
                  <label style={styles.avatarButton}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                    Upload Photo
                  </label>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={styles.input}
                    placeholder="How should we call you?"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    style={styles.textarea}
                    placeholder="Tell us a bit about yourself..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Interests Step */}
          {currentStep === 'interests' && (
            <div style={styles.stepContent}>
              <h2 style={styles.stepTitle}>What are you interested in?</h2>
              <p style={styles.stepDescription}>
                Select topics to personalize your experience
              </p>

              <div style={styles.interestsGrid}>
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest.id}
                    style={{
                      ...styles.interestButton,
                      ...(selectedInterests.includes(interest.id) ? styles.interestButtonSelected : {}),
                    }}
                    onClick={() => toggleInterest(interest.id)}
                  >
                    <SNIcon
                      name={interest.icon as any}
                      size={24}
                      color={selectedInterests.includes(interest.id) ? '#fff' : '#8b5cf6'}
                    />
                    <span>{interest.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Template Step */}
          {currentStep === 'template' && (
            <div style={styles.stepContent}>
              <h2 style={styles.stepTitle}>Choose a Template</h2>
              <p style={styles.stepDescription}>
                Start with a template or create from scratch
              </p>

              <div style={styles.templatesGrid}>
                <button
                  style={{
                    ...styles.templateCard,
                    ...(selectedTemplate === null ? styles.templateCardSelected : {}),
                  }}
                  onClick={() => setSelectedTemplate(null)}
                >
                  <div style={styles.templateBlank}>
                    <SNIcon name="plus" size={32} color="#8b5cf6" />
                  </div>
                  <span style={styles.templateName}>Blank Canvas</span>
                </button>

                {templates.map((template) => (
                  <button
                    key={template.id}
                    style={{
                      ...styles.templateCard,
                      ...(selectedTemplate === template.id ? styles.templateCardSelected : {}),
                    }}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div style={styles.templateThumbnail}>
                      {template.thumbnail ? (
                        <img src={template.thumbnail} alt="" style={styles.templateImg} />
                      ) : (
                        <SNIcon name="layout" size={32} color="#8b5cf6" />
                      )}
                    </div>
                    <span style={styles.templateName}>{template.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div style={styles.stepContent}>
              <div style={styles.completeIcon}>
                <SNIcon name="check" size={48} color="#fff" />
              </div>
              <h2 style={styles.title}>You're All Set!</h2>
              <p style={styles.description}>
                Your account is ready. Start creating amazing canvases!
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          {currentStep !== 'welcome' && currentStep !== 'complete' && (
            <SNButton variant="ghost" onClick={handleBack}>
              Back
            </SNButton>
          )}

          <div style={styles.actionsRight}>
            {currentStep !== 'complete' && (
              <SNButton variant="ghost" onClick={onSkip}>
                Skip
              </SNButton>
            )}
            <SNButton
              variant="primary"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? 'Loading...' : currentStep === 'complete' ? 'Get Started' : 'Continue'}
            </SNButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    width: '100%',
    maxWidth: 560,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f19 100%)',
    borderRadius: 24,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    overflow: 'hidden',
  },
  progress: {
    display: 'flex',
    gap: 8,
    padding: '24px 32px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  progressStep: {
    flex: 1,
    height: 4,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    transition: 'background 0.3s',
  },
  progressStepActive: {
    background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
  },
  content: {
    padding: '32px',
    minHeight: 400,
  },
  stepContent: {
    textAlign: 'center',
  },
  welcomeIcon: {
    width: 96,
    height: 96,
    margin: '0 auto 24px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    borderRadius: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeIcon: {
    width: 96,
    height: 96,
    margin: '0 auto 24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: '0 0 12px',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: '0 0 8px',
  },
  description: {
    fontSize: 16,
    color: '#94a3b8',
    margin: '0 0 32px',
    lineHeight: 1.6,
  },
  stepDescription: {
    fontSize: 14,
    color: '#94a3b8',
    margin: '0 0 32px',
  },
  features: {
    display: 'flex',
    justifyContent: 'center',
    gap: 32,
  },
  feature: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    color: '#94a3b8',
    fontSize: 14,
  },
  form: {
    textAlign: 'left',
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
    justifyContent: 'center',
  },
  avatarUpload: {
    width: 80,
    height: 80,
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarButton: {
    padding: '10px 16px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    color: '#8b5cf6',
    fontSize: 14,
    cursor: 'pointer',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: 8,
    textAlign: 'left',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'none',
    fontFamily: 'inherit',
  },
  interestsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  interestButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    color: '#f1f5f9',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  interestButtonSelected: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    borderColor: 'transparent',
  },
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
  templateCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 12,
    background: 'rgba(139, 92, 246, 0.05)',
    border: '2px solid transparent',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  templateCardSelected: {
    borderColor: '#8b5cf6',
    background: 'rgba(139, 92, 246, 0.1)',
  },
  templateBlank: {
    aspectRatio: '4/3',
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateThumbnail: {
    aspectRatio: '4/3',
    background: 'rgba(15, 15, 25, 0.6)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  templateImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  templateName: {
    fontSize: 13,
    color: '#f1f5f9',
    textAlign: 'center',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 32px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  actionsRight: {
    display: 'flex',
    gap: 12,
  },
};

export default OnboardingFlow;
