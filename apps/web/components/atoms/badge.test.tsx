import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/atoms/badge';
import { render, screen } from '@/lib/test/render';

/**
 * FE_14 R8 — an atom, so every state it claims is covered. They are cheap, and this is
 * the shared surface: a tone that silently stops rendering is a defect in every consumer
 * at once.
 *
 * FE_14 R1 — each test asserts something a user can perceive. None of them reads a class
 * name, which would pass through any refactor that preserved the mechanism and fail on
 * every one that did not.
 */
describe('Badge', () => {
  it('shows the text it is given', () => {
    render(<Badge>Archived</Badge>);

    expect(screen.getByText('Archived')).toBeVisible();
  });

  it.each(['neutral', 'success', 'warning', 'danger'] as const)(
    'renders its %s tone without losing the text',
    (tone) => {
      render(<Badge tone={tone}>Status</Badge>);

      expect(screen.getByText('Status')).toBeVisible();
    },
  );

  it('lets a caller name it for assistive technology', () => {
    // FE_05 R7 — a component that swallowed `aria-*` would make FE_06 R7 impossible to
    // obey from outside. This is the test that notices if it starts doing so.
    render(<Badge aria-label="Overdue by two days">Overdue</Badge>);

    expect(screen.getByLabelText('Overdue by two days')).toBeVisible();
  });

  it('lets a caller override a style it set', () => {
    // FE_04 R5 — the merge is conflict-aware, so the caller's padding replaces the
    // variant's rather than both landing and stylesheet order deciding.
    render(<Badge className="px-4">Merged</Badge>);

    const badge = screen.getByText('Merged');
    expect(badge).toHaveClass('px-4');
    expect(badge).not.toHaveClass('px-2');
  });
});
