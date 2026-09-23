import { describe, expect, it } from 'vitest';
import { EmptyState } from '@/components/molecules/empty-state';
import { render, screen } from '@/lib/test/render';

/**
 * FE_14 R8 — a molecule, so what is covered is the behaviour it composes: what the
 * arrangement does that its parts do not.
 */
describe('EmptyState', () => {
  it('shows the title on its own', () => {
    render(<EmptyState title="No lists yet" />);

    expect(screen.getByText('No lists yet')).toBeVisible();
  });

  it('shows the description beside the title when there is one', () => {
    render(<EmptyState title="No lists yet" description="Create one above." />);

    expect(screen.getByText('No lists yet')).toBeVisible();
    expect(screen.getByText('Create one above.')).toBeVisible();
  });

  it('renders an action passed as a child', () => {
    // The arrangement's actual job: an empty state that can carry the way out of itself.
    render(
      <EmptyState title="No lists yet">
        <button type="button">Create a list</button>
      </EmptyState>,
    );

    expect(screen.getByRole('button', { name: 'Create a list' })).toBeVisible();
  });
});
