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
      // ========================================
      // 1단계: 컨설팅 중복 예약 확인
      // ========================================
      const { data: existingReservations, error: consultingError } =
        await supabase
          .from('consulting_reservations')
          .select('*, consulting_slots(*)')
          .eq('parent_phone', phone)
          .in('status', ['confirmed', 'pending'])
          .order('created_at', { ascending: false });

      if (consultingError) throw consultingError;

      if (existingReservations && existingReservations.length > 0) {
        // 중복 예약 있음
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
      // 2단계: 설명회 예약/참석 이력 확인
      // ========================================
      const { data: seminarAttendance, error: seminarError } = await supabase
        .from('reservations')
        .select('*, seminars!inner(*)')
        .eq('parent_phone', phone)
        .in('status', ['예약', '참석'])
        .eq('seminars.status', 'active')
        .order('id', { ascending: false })
        .limit(1);

      if (seminarError) throw seminarError;

      // ========================================
      // 3단계: 예약자 vs 미예약자 분기
      // ========================================
      if (seminarAttendance && seminarAttendance.length > 0) {
        // 🎯 설명회 예약자 (예약 또는 참석)
        const attendeeInfo = seminarAttendance[0];
        const seminar = attendeeInfo.seminars;

        // 설명회 location을 지역명으로 매핑
        const locationMapping = {
          '수학의 아침 수내캠퍼스': '분당점',
          '넥스트닥 (대치동 912-31, 대치스터디타워 5층)': '대치점',
          '강남점 2층 세미나실': '강남점',
          '서초점 3층 강의실': '서초점',
          '역삼점 1층 컨설팅룸': '역삼점',
        };

        const mappedLocation =
          locationMapping[seminar.location] || seminar.location;

        // Context에 지역 자동 선택
        setSelectedLocation(mappedLocation);

        setLoading(false);

        // 예약자 정보와 함께 다음 단계로 (LocationSelector 건너뛰기)
        showToast(`${seminar.title} 예약자로 확인되었습니다.`, 'success', 3000);

        onAttendeeNext(phone, {
          studentName: attendeeInfo.student_name,
          school: attendeeInfo.school,
          grade: attendeeInfo.grade,
          location: mappedLocation, // 표시용
          originalLocation: seminar.location, // DB 조회용
          linkedSeminarId: seminar.id,
          isSeminarAttendee: true,
        });
      } else {
        // 🎯 설명회 미예약자
        setLoading(false);
        onNext(phone);
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
