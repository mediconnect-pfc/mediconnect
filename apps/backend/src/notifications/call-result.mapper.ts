export type CallPatientAction = 'confirmed' | 'cancelled' | 'no_response' | 'unreachable' | 'unknown';

export function mapCallPatientAction(
  finalVariables: Record<string, unknown> | undefined,
  callOutcome?: string,
): CallPatientAction {
  const action = finalVariables?.['appointment.action'] as string | undefined;
  const dtmf = finalVariables?.['dtmf.response'] as string | undefined;

  if (action === 'confirmed' || dtmf === '1') return 'confirmed';
  if (action === 'cancelled' || dtmf === '2') return 'cancelled';
  if (action === 'no_response') return 'no_response';
  if (callOutcome && ['busy', 'no_answer', 'failed'].includes(callOutcome)) return 'unreachable';
  return 'unknown';
}

export function buildCallTranscript(params: {
  action: CallPatientAction;
  dtmf?: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  durationMs?: number;
}): string {
  const lines = [
    `Appel H-24 confirmation RDV avec ${params.doctorName}`,
    `Date: ${params.appointmentDate} a ${params.appointmentTime}`,
  ];

  switch (params.action) {
    case 'confirmed':
      lines.push('Reponse patient: confirme (touche 1)');
      break;
    case 'cancelled':
      lines.push('Reponse patient: annule (touche 2)');
      break;
    case 'no_response':
      lines.push('Reponse patient: aucune touche');
      break;
    case 'unreachable':
      lines.push('Patient injoignable');
      break;
    default:
      lines.push(`Reponse: ${params.action}${params.dtmf ? ` (DTMF ${params.dtmf})` : ''}`);
  }

  if (params.durationMs) {
    lines.push(`Duree: ${Math.round(params.durationMs / 1000)}s`);
  }

  return lines.join('\n');
}
