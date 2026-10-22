import '@pixsame/cypress-plugin-visual-regression-diff';
import { mount } from 'cypress/react';
import AppTheme from '../../src/theme';
import { createElement } from 'react';

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', (component, options) => mount(createElement(AppTheme, { children: component }), options));
