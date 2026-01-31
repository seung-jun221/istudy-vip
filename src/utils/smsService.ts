/**
 * SMS 발송 서비스
 * Netlify Function을 통해 뿌리오 API 호출 (CORS 우회)
 */

// SMS 발송 응답 타입
interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Netlify Function URL
const SMS_FUNCTION_URL = '/.netlify/functions/send-sms';

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
  try {
    const response = await fetch(SMS_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.parentPhone,
        type: 'reservation',
        params: {
          studentName: params.studentName,
          eventDate: params.eventDate,
          eventTime: params.eventTime,
          location: params.location,
        },
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return {
        success: true,
        messageId: result.messageKey,
      };
    } else {
      console.error('SMS 발송 실패:', result);
      return {
        success: false,
        error: result.error || 'SMS 발송에 실패했습니다.',
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
 * 대기 신청 완료 문자 발송
 */
export async function sendWaitlistConfirmSms(params: {
  studentName: string;
  parentPhone: string;
  eventDate?: string;
}): Promise<SendSmsResponse> {
  try {
    const response = await fetch(SMS_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.parentPhone,
        type: 'waitlist',
        params: {
          studentName: params.studentName,
          eventDate: params.eventDate,
        },
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return {
        success: true,
        messageId: result.messageKey,
      };
    } else {
      console.error('SMS 발송 실패:', result);
      return {
        success: false,
        error: result.error || 'SMS 발송에 실패했습니다.',
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

export default {
  sendReservationConfirmSms,
  sendWaitlistConfirmSms,
};
