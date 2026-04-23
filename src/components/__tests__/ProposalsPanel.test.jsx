import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import ProposalsPanel from '../ProposalsPanel.jsx';

const terrainMeters = [
  { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 },
];

const mkProposal = (id, score, overrides = {}) => ({
  id,
  createdAt: 1000,
  score,
  elements: [
    { id: 'a', definitionId: 'casa', x: 10, y: 10, width: 4, height: 4, rotation: 0, shape: 'rectangle' },
  ],
  paths: [],
  constraintReport: [],
  ...overrides,
});

describe('ProposalsPanel', () => {
  let props;
  beforeEach(() => {
    props = {
      proposals: [],
      selectedProposalId: null,
      isGenerating: false,
      progress: null,
      terrainMeters,
      onSelect: vi.fn(),
      onAccept: vi.fn(),
      onDiscard: vi.fn(),
      onIterate: vi.fn(),
      onGenerate: vi.fn(),
      onClose: vi.fn(),
    };
  });

  test('renders Generar button and calls onGenerate when clicked', () => {
    const { getByTestId } = render(<ProposalsPanel {...props} />);
    fireEvent.click(getByTestId('generate-proposals'));
    expect(props.onGenerate).toHaveBeenCalled();
  });

  test('disables generate button when isGenerating', () => {
    const { getByTestId } = render(<ProposalsPanel {...props} isGenerating={true} />);
    expect(getByTestId('generate-proposals')).toBeDisabled();
  });

  test('shows progress when generating', () => {
    const { getByTestId } = render(
      <ProposalsPanel {...props} isGenerating={true} progress={{ done: 2, total: 5 }} />
    );
    expect(getByTestId('progress').textContent).toMatch(/2.*5/);
  });

  test('empty state message when no proposals and not generating', () => {
    const { getByText } = render(<ProposalsPanel {...props} />);
    expect(getByText(/Sin propuestas/)).toBeInTheDocument();
  });

  test('renders each proposal with score', () => {
    const proposals = [mkProposal('p1', 12.34), mkProposal('p2', 45.67)];
    const { getByText } = render(<ProposalsPanel {...props} proposals={proposals} />);
    expect(getByText(/12.34/)).toBeInTheDocument();
    expect(getByText(/45.67/)).toBeInTheDocument();
  });

  test('click on proposal calls onSelect with id', () => {
    const proposals = [mkProposal('p1', 10)];
    const { getByTestId } = render(<ProposalsPanel {...props} proposals={proposals} />);
    fireEvent.click(getByTestId('proposal-p1'));
    expect(props.onSelect).toHaveBeenCalledWith('p1');
  });

  test('selected proposal has distinctive styling', () => {
    const proposals = [mkProposal('p1', 10)];
    const { getByTestId } = render(
      <ProposalsPanel {...props} proposals={proposals} selectedProposalId="p1" />
    );
    expect(getByTestId('proposal-p1').className).toMatch(/border-blue/);
  });

  test('Aceptar button calls onAccept', () => {
    const proposals = [mkProposal('p1', 10)];
    const { getByText } = render(<ProposalsPanel {...props} proposals={proposals} />);
    fireEvent.click(getByText('Aceptar'));
    expect(props.onAccept).toHaveBeenCalledWith('p1');
  });

  test('Descartar button calls onDiscard', () => {
    const proposals = [mkProposal('p1', 10)];
    const { getByText } = render(<ProposalsPanel {...props} proposals={proposals} />);
    fireEvent.click(getByText('Descartar'));
    expect(props.onDiscard).toHaveBeenCalledWith('p1');
  });

  test('Iterar button calls onIterate', () => {
    const proposals = [mkProposal('p1', 10)];
    const { getByText } = render(<ProposalsPanel {...props} proposals={proposals} />);
    fireEvent.click(getByText('Iterar'));
    expect(props.onIterate).toHaveBeenCalledWith('p1');
  });

  test('action buttons do not trigger select (stopPropagation)', () => {
    const proposals = [mkProposal('p1', 10)];
    const { getByText } = render(<ProposalsPanel {...props} proposals={proposals} />);
    fireEvent.click(getByText('Aceptar'));
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  test('shows violation count when constraintReport has failures', () => {
    const proposals = [mkProposal('p1', 10, {
      constraintReport: [{ valid: false }, { valid: false }, { valid: true }],
    })];
    const { getByText } = render(<ProposalsPanel {...props} proposals={proposals} />);
    expect(getByText(/Viola 2/)).toBeInTheDocument();
  });
});
