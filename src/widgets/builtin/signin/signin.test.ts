/**
 * Signin Widgets Test Suite
 * Verifies that all signin widgets are properly structured and loadable
 */

import { describe, it, expect } from 'vitest';
import {
  CustomerSignInWidget,
  CustomerProfileWidget,
  CustomerSubscriptionWidget,
  CustomerAccountMenuWidget,
  SIGNIN_WIDGETS,
  SIGNIN_PIPELINE_TEMPLATES,
} from './index';

describe('Signin Widgets', () => {
  describe('CustomerSignInWidget', () => {
    it('should have valid manifest', () => {
      expect(CustomerSignInWidget.manifest).toBeDefined();
      expect(CustomerSignInWidget.manifest.id).toBe('stickernest.customer-signin');
      expect(CustomerSignInWidget.manifest.name).toBe('Customer Sign In');
      expect(CustomerSignInWidget.manifest.version).toBe('1.0.0');
      expect(CustomerSignInWidget.manifest.kind).toBe('interactive');
    });

    it('should have HTML content', () => {
      expect(CustomerSignInWidget.html).toBeDefined();
      expect(CustomerSignInWidget.html).toContain('<!DOCTYPE html>');
      expect(CustomerSignInWidget.html).toContain('widget:ready');
    });

    it('should have proper inputs and outputs', () => {
      const { inputs, outputs } = CustomerSignInWidget.manifest;
      expect(inputs).toBeDefined();
      expect(outputs).toBeDefined();
      expect(outputs.length).toBeGreaterThan(0);

      const outputIds = outputs.map((o: { id: string }) => o.id);
      expect(outputIds).toContain('onLogin');
      expect(outputIds).toContain('onLogout');
    });

    it('should have io declarations for AI wiring', () => {
      const { io } = CustomerSignInWidget.manifest;
      expect(io).toBeDefined();
      expect(io.inputs).toContain('trigger.showRegister');
      expect(io.outputs).toContain('auth.login');
    });
  });

  describe('CustomerProfileWidget', () => {
    it('should have valid manifest', () => {
      expect(CustomerProfileWidget.manifest).toBeDefined();
      expect(CustomerProfileWidget.manifest.id).toBe('stickernest.customer-profile');
      expect(CustomerProfileWidget.manifest.name).toBe('Customer Profile');
    });

    it('should have HTML content', () => {
      expect(CustomerProfileWidget.html).toBeDefined();
      expect(CustomerProfileWidget.html).toContain('<!DOCTYPE html>');
    });

    it('should have profile-related outputs', () => {
      const outputIds = CustomerProfileWidget.manifest.outputs.map((o: { id: string }) => o.id);
      expect(outputIds).toContain('onProfileUpdate');
      expect(outputIds).toContain('onAvatarChange');
    });
  });

  describe('CustomerSubscriptionWidget', () => {
    it('should have valid manifest', () => {
      expect(CustomerSubscriptionWidget.manifest).toBeDefined();
      expect(CustomerSubscriptionWidget.manifest.id).toBe('stickernest.customer-subscription');
      expect(CustomerSubscriptionWidget.manifest.name).toBe('Customer Subscription');
    });

    it('should have HTML content', () => {
      expect(CustomerSubscriptionWidget.html).toBeDefined();
      expect(CustomerSubscriptionWidget.html).toContain('<!DOCTYPE html>');
    });

    it('should have subscription-related outputs', () => {
      const outputIds = CustomerSubscriptionWidget.manifest.outputs.map((o: { id: string }) => o.id);
      expect(outputIds).toContain('onSubscribe');
      expect(outputIds).toContain('onCancel');
      expect(outputIds).toContain('onUpgrade');
    });
  });

  describe('CustomerAccountMenuWidget', () => {
    it('should have valid manifest', () => {
      expect(CustomerAccountMenuWidget.manifest).toBeDefined();
      expect(CustomerAccountMenuWidget.manifest.id).toBe('stickernest.customer-account-menu');
      expect(CustomerAccountMenuWidget.manifest.name).toBe('Customer Account Menu');
    });

    it('should have HTML content', () => {
      expect(CustomerAccountMenuWidget.html).toBeDefined();
      expect(CustomerAccountMenuWidget.html).toContain('<!DOCTYPE html>');
    });

    it('should have navigation outputs', () => {
      const outputIds = CustomerAccountMenuWidget.manifest.outputs.map((o: { id: string }) => o.id);
      expect(outputIds).toContain('onNavigate');
      expect(outputIds).toContain('onSignInClick');
      expect(outputIds).toContain('onProfileClick');
      expect(outputIds).toContain('onSubscriptionClick');
    });
  });

  describe('SIGNIN_WIDGETS registry', () => {
    it('should contain all 4 signin widgets', () => {
      expect(Object.keys(SIGNIN_WIDGETS)).toHaveLength(4);
      expect(SIGNIN_WIDGETS['stickernest.customer-signin']).toBeDefined();
      expect(SIGNIN_WIDGETS['stickernest.customer-profile']).toBeDefined();
      expect(SIGNIN_WIDGETS['stickernest.customer-subscription']).toBeDefined();
      expect(SIGNIN_WIDGETS['stickernest.customer-account-menu']).toBeDefined();
    });

    it('should have unique widget IDs', () => {
      const ids = Object.keys(SIGNIN_WIDGETS);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid manifests for all widgets', () => {
      for (const [id, widget] of Object.entries(SIGNIN_WIDGETS)) {
        expect(widget.manifest.id).toBe(id);
        expect(widget.manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(widget.html).toBeDefined();
      }
    });
  });

  describe('SIGNIN_PIPELINE_TEMPLATES', () => {
    it('should have pipeline templates', () => {
      expect(SIGNIN_PIPELINE_TEMPLATES).toBeDefined();
      expect(Object.keys(SIGNIN_PIPELINE_TEMPLATES).length).toBeGreaterThan(0);
    });

    it('should have basicAccount template', () => {
      expect(SIGNIN_PIPELINE_TEMPLATES.basicAccount).toBeDefined();
      expect(SIGNIN_PIPELINE_TEMPLATES.basicAccount.name).toBe('Basic Account');
      expect(SIGNIN_PIPELINE_TEMPLATES.basicAccount.connections.length).toBeGreaterThan(0);
    });

    it('should have fullAccountHub template', () => {
      expect(SIGNIN_PIPELINE_TEMPLATES.fullAccountHub).toBeDefined();
      expect(SIGNIN_PIPELINE_TEMPLATES.fullAccountHub.name).toBe('Full Account Hub');
    });

    it('should have memberPortal template', () => {
      expect(SIGNIN_PIPELINE_TEMPLATES.memberPortal).toBeDefined();
      expect(SIGNIN_PIPELINE_TEMPLATES.memberPortal.name).toBe('Member Portal');
      expect(SIGNIN_PIPELINE_TEMPLATES.memberPortal.connections.length).toBeGreaterThan(5);
    });

    it('should have valid connection structure', () => {
      for (const template of Object.values(SIGNIN_PIPELINE_TEMPLATES)) {
        for (const conn of template.connections) {
          expect(conn.source).toBeDefined();
          expect(conn.sourcePort).toBeDefined();
          expect(conn.target).toBeDefined();
          expect(conn.targetPort).toBeDefined();
        }
      }
    });
  });
});
