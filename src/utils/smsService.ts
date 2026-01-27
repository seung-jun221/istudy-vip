/**
 * 뿌리오 SMS 발송 서비스
 * https://ppurio.com API 연동
 */

// 뿌리오 API 설정
const PPURIO_CONFIG = {
  apiKey: '3057babbebf4fbe2a83ae36b17a978d3cfb9bb2a94012f0245348ac3be9418c7',
  senderNumber: '0517151580', // 발신번호 (하이픈 제거)
  apiUrl: 'https://message.ppurio.com/api/send-sms', // 뿌리오 SMS API URL
};

// SMS 발송 요청 타입
interface SendSmsRequest {
  to: string; // 수신번호
  message: string; // 메시지 내용
}

// SMS 발송 응답 타입
interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 전화번호 정규화 (하이픈 제거)
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * SMS 발송
 */
export async function sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
  try {
    const response = await fetch(PPURIO_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PPURIO_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        account: PPURIO_CONFIG.apiKey,
        from: PPURIO_CONFIG.senderNumber,
        to: normalizePhoneNumber(request.to),
        content: request.message,
      }),
    });

    const result = await response.json();

    if (response.ok && result.code === '1000') {
      return {
        success: true,
        messageId: result.messageId,
      };
    } else {
      console.error('SMS 발송 실패:', result);
      return {
        success: false,
        error: result.message || 'SMS 발송에 실패했습니다.',
      };
    }
  } catch (error) {
    console.error('SMS 발송 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMS 발송 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 설명회 예약 완료 문자 발송
 */
export async function sendReservationConfirmSms(params: {
  studentName: string;
  parentPhone: string;
  eventDate: string;
  eventTime: string;
  location?: string;
}): Promise<SendSmsResponse> {
  const { studentName, parentPhone, eventDate, eventTime, location } = params;

  const message = `[아이스터디 수리탐구]
${studentName} 학생의 설명회 예약이 완료되었습니다.

일시: ${eventDate} ${eventTime}
${location ? `장소: ${location}` : ''}
문의: 051-715-1580`;

  return sendSms({
    to: parentPhone,
    message: message.trim(),
  });
}

/**
 * 대기 신청 완료 문자 발송
 */
export async function sendWaitlistConfirmSms(params: {
  studentName: string;
  parentPhone: string;
  eventDate?: string;
}): Promise<SendSmsResponse> {
  const { studentName, parentPhone, eventDate } = params;

  const message = `[아이스터디 수리탐구]
${studentName} 학생의 대기 신청이 완료되었습니다.
${eventDate ? `희망일: ${eventDate}` : ''}
자리가 나면 연락드리겠습니다.

문의: 051-715-1580`;

  return sendSms({
    to: parentPhone,
    message: message.trim(),
  });
}

export default {
  sendSms,
  sendReservationConfirmSms,
  sendWaitlistConfirmSms,
};
