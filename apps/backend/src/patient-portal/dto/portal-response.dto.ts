export class PortalResponseDto {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  nextAppointment: {
    id: string;
    doctorName: string;
    date: Date;
    status: string;
  } | null;
  appointments: {
    id: string;
    doctorName: string;
    date: Date;
    status: string;
  }[];
  smsHistory: {
    id: string;
    message: string;
    sentAt: Date;
    type: string;
  }[];
}
