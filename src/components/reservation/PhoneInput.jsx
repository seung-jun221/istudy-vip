import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { validatePhone, formatPhone } from '../../utils/format';
import { useReservation } from '../../context/ReservationContext';

export default function PhoneInput({ onNext, onLoadPrevious }) {
  const [phone, setPhone] = useState('');
  const { showToast } = useReservation();

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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validatePhone(phone)) {
      showToast('올바른 전화번호를 입력해주세요.', 'error');
      return;
    }

    onNext(phone);
  };

  const handleLoadPrevious = async () => {
    if (!validatePhone(phone)) {
      showToast('전화번호를 먼저 입력해주세요.', 'error');
      return;
    }

    onLoadPrevious(phone);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="학부모 연락처"
        type="tel"
        value={phone}
        onChange={handlePhoneChange}
        placeholder="010-0000-0000"
        required
      />

      <Button type="button" variant="secondary" onClick={handleLoadPrevious}>
        이전 정보 불러오기
      </Button>

      <Button type="submit">다음</Button>
    </form>
  );
}
