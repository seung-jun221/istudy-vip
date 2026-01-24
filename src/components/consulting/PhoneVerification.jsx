import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { validatePhone } from '../../utils/format';
import { useConsulting } from '../../context/ConsultingContext';
import { supabase } from '../../utils/supabase';

export default function PhoneVerification({ onNext, onAttendeeNext }) {
  const [phone, setPhone] = useState('');
  const { showToast, setLoading, setSelectedLocation } = useConsulting();

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;

    if (value.length >= 4 && value.length <= 7) {
      formatted = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length >= 8) {
      formatted =
        value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }

    setPhone(formatted);
  };

  const handleSubmit = async () => {
    if (!validatePhone(phone)) {
      showToast('올바른 전화번호를 입력해주세요.', 'error');
      return;
    }

    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      // ========================================
      // 1단계: 컨설팅 중복 예약 확인 (미래 날짜만)
      // ========================================
      const { data: existingReservations, error: consultingError } =
        await supabase
          .from('consulting_reservations')
          .select('*, consulting_slots!inner(*)') // ⭐ inner join으로 슬롯 정보 필수
          .eq('parent_phone', phone)
          .neq('status', 'cancelled') // ⭐ 취소된 예약 제외
          .neq('status', 'auto_cancelled') // ⭐ 자동 취소된 예약 제외
          .gte('consulting_slots.date', today) // ⭐ 오늘 이후 예약만
          .order('created_at', { ascending: false });

      if (consultingError) throw consultingError;

      if (existingReservations && existingReservations.length > 0) {
        // 중복 예약 있음 (미래 날짜)
        const latest = existingReservations[0];
        const slot = latest.consulting_slots;

        if (slot) {
          const date = new Date(slot.date);
          const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`;
          const timeStr = slot.time.slice(0, 5);

          showToast(
            `이미 ${dateStr} ${timeStr}에 예약이 있습니다.`,
            'warning',
            5000
          );
        } else {
          showToast('이미 예약이 존재합니다.', 'warning');
        }

        setLoading(false);
        return;
      }

      // ========================================
      // 2단계: 설명회 예약 이력 확인 (모든 상태 조회)
      // ========================================
      const { data: seminarAttendance, error: seminarError } = await supabase
        .from('reservations')
        .select(`
          *,
          seminar_slots!inner(
            *,
            campaigns(*)
          )
        `)
        .eq('parent_phone', phone)
        .eq('seminar_slots.status', 'active')
        .order('id', { ascending: false })
        .limit(1);

      if (seminarError) throw seminarError;

      // ========================================
      // 3단계: 설명회 상태에 따른 분기
      // ========================================
      if (seminarAttendance && seminarAttendance.length > 0) {
        const attendeeInfo = seminarAttendance[0];
        const seminarSlot = attendeeInfo.seminar_slots;
        const campaign = seminarSlot?.campaigns;
        const status = attendeeInfo.status;

        console.log('🎯 설명회 예약 확인:', {
          status,
          seminarDate: seminarSlot?.date,
          seminarTime: seminarSlot?.time,
        });

        // ⭐ "참석" 상태만 컨설팅 예약 가능
        if (status === '참석') {
          const location = seminarSlot.location;
          const campaignId = campaign?.id;

          // 대표 컨설팅 자격 확인: "참석" 상태 + 설명회 시간 경과
          const now = new Date();
          const seminarDateTime = new Date(`${seminarSlot.date}T${seminarSlot.time}`);
          const isEligibleForCeo = seminarDateTime < now;

          console.log('✅ 컨설팅 예약 자격 있음:', { isEligibleForCeo });

          setSelectedLocation(location);
          setLoading(false);

          showToast(`${campaign?.title || '설명회'} 참석자로 확인되었습니다.`, 'success', 3000);

          onAttendeeNext(phone, {
            studentName: attendeeInfo.student_name,
            school: attendeeInfo.school,
            grade: attendeeInfo.grade,
            mathLevel: attendeeInfo.math_level,
            password: attendeeInfo.password,
            location: location,
            linkedSeminarId: campaignId,
            isSeminarAttendee: true,
            isEligibleForCeo: isEligibleForCeo,
            seminarStatus: status,
          });
        }
        // ⭐ "예약", "대기" 상태 - 아직 참석 전
        else if (status === '예약' || status === '대기') {
          setLoading(false);
          showToast('설명회 참석 확인 후 컨설팅 예약이 가능합니다.', 'warning', 5000);
        }
        // ⭐ "불참", "취소" 등 - 예약 불가
        else {
          setLoading(false);
          showToast('설명회 미참석자로 현재 컨설팅 예약이 불가합니다.', 'error', 5000);
        }
      } else {
        // 🎯 설명회 예약 이력 없음
        setLoading(false);
        showToast('설명회 예약 이력이 없습니다. 설명회 참석 후 컨설팅 예약이 가능합니다.', 'warning', 5000);
      }
    } catch (error) {
      console.error('예약 확인 실패:', error);
      showToast('예약 확인 중 오류가 발생했습니다.', 'error');
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-600 mb-4">
        컨설팅 예약을 위해 학부모님 연락처를 입력해주세요.
      </p>

      <Input
        label="학부모 연락처"
        type="tel"
        value={phone}
        onChange={handlePhoneChange}
        placeholder="010-0000-0000"
        required
        onKeyPress={handleKeyPress}
      />

      <div className="info-box" style={{ fontSize: '13px', padding: '12px' }}>
        💡 <strong>안내:</strong> 설명회 예약자는 자동으로 해당 지역 전용 컨설팅
        날짜가 제공됩니다.
      </div>

      <Button onClick={handleSubmit}>다음</Button>
    </div>
  );
}
