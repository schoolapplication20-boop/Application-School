import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock heavy/external dependencies
vi.mock('../../../components/SEOMeta', () => ({ default: () => null }));
vi.mock('../../../pages/marketing/marketing.css', () => ({}));

// Mock Helmet
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }) => <>{children}</>,
  HelmetProvider: ({ children }) => <>{children}</>,
}));

import HomePage from '../../../pages/marketing/HomePage';

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

describe('HomePage — Hero Section', () => {
  it('renders the main headline', () => {
    renderHomePage();
    // The title is "The All-in-One School Management Platform" split across spans
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/School Management/i);
  });

  it('renders Book Demo CTA button', () => {
    renderHomePage();
    const demoBtn = screen.getAllByRole('link').find(
      el => el.textContent.toLowerCase().includes('demo')
    );
    expect(demoBtn).toBeDefined();
  });
});

describe('HomePage — School Lifecycle Section', () => {
  it('renders all 8 lifecycle stage titles', () => {
    renderHomePage();
    const expectedStages = [
      'Admissions',
      'Enrollment',
      'Attendance',
      'Timetable',
      'Exams & Marks',
      'Fee Collection',
      'Reports',
      'Graduation',
    ];
    expectedStages.forEach(stage => {
      expect(screen.getByText(stage)).toBeInTheDocument();
    });
  });

  it('renders lifecycle section tag "School Lifecycle"', () => {
    renderHomePage();
    // The section tag reads "School Lifecycle" (not "School Management Lifecycle")
    expect(screen.getByText('School Lifecycle')).toBeInTheDocument();
  });
});

describe('HomePage — Features Section', () => {
  it('renders "How It Works" section or features heading', () => {
    renderHomePage();
    const heading = screen.queryByText(/How It Works/i) ||
                    screen.queryByText(/Features/i) ||
                    screen.queryByText(/What we offer/i);
    expect(heading).toBeTruthy();
  });
});

describe('HomePage — Stats / Trust Bar', () => {
  it('renders trust bar with school types', () => {
    renderHomePage();
    // Trust bar shows school types like "Primary Schools", "CBSE Schools" etc.
    const stat = screen.queryByText(/Primary Schools/i) ||
                 screen.queryByText(/CBSE Schools/i) ||
                 screen.queryByText(/Designed for every type/i);
    expect(stat).toBeTruthy();
  });
});

describe('HomePage — CTA / Navigation', () => {
  it('renders navigation links to key pages', () => {
    renderHomePage();
    const links = screen.getAllByRole('link');
    const hrefs = links.map(l => l.getAttribute('href') || l.getAttribute('to') || '');
    // At least one link to demo or contact
    const hasContactOrDemo = hrefs.some(
      h => h.includes('demo') || h.includes('contact') || h.includes('solutions')
    );
    expect(hasContactOrDemo).toBe(true);
  });
});

describe('HomePage — SEO / Structured Data', () => {
  it('renders without crashing and has root element', () => {
    const { container } = renderHomePage();
    expect(container.firstChild).toBeTruthy();
  });
});
