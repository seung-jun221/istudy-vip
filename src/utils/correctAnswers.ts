/**
 * 진단검사 정답표
 * TODO: 실제 정답으로 업데이트 필요
 */

import type { TestType } from '../types/diagnostic';

export type CorrectAnswers = { [questionNumber: number]: string };

/**
 * MONO 진단검사 정답표 (중1-1)
 */
export const MONO_CORRECT_ANSWERS: CorrectAnswers = {
  1: '5',
  2: '8',
  3: '16',
  4: '47/14',
  5: '110',
  6: '9',
  7: '0',
  8: '294',
  9: '8',
  10: '-32',
  11: '52',
  12: '3',
  13: '-5b+1',
  14: '1',
  15: '3/26',
  16: '-10/7',
  17: '-7',
  18: '-1',
  19: '0',
  20: '42',
  21: '-14',
  22: 'x>2',
  23: '1',
  24: '-2',
  25: '2/3',
};

/**
 * DI 진단검사 정답표 (중2-1)
 */
export const DI_CORRECT_ANSWERS: CorrectAnswers = {
  1: '7',
  2: '-5b+1',
  3: '1',
  4: '27',
  5: '13',
  6: '68',
  7: '0',
  8: '3',
  9: '4',
  10: '8',
  11: '48',
  12: '15',
  13: '3/26',
  14: '-10/7',
  15: '1',
  16: '5/4',
  17: '1',
  18: '3',
  19: '-10/3',
  20: '-7',
  21: '5/3',
  22: '2',
  23: '55/3',
  24: '-1/2',
  25: '7',
};

/**
 * TRI 진단검사 정답표 (중3-1 + 공통수학1)
 */
export const TRI_CORRECT_ANSWERS: CorrectAnswers = {
  1: '-a',
  2: '40',
  3: '-1',
  4: '15',
  5: '21',
  6: '13/6',
  7: '9',
  8: '-3',
  9: '195',
  10: '-10',
  11: '5',
  12: '9',
  13: '1',
  14: '14',
  15: '-5',
  16: '2',
  17: '0',
  18: '22',
  19: '5',
  20: '31/8',
  21: '1',
  22: '6',
  23: '-12',
  24: '0',
  25: '-6',
};

/**
 * 시험 타입에 따른 정답표 가져오기
 */
export function getCorrectAnswers(testType: TestType): CorrectAnswers {
  switch (testType) {
    case 'MONO':
      return MONO_CORRECT_ANSWERS;
    case 'DI':
      return DI_CORRECT_ANSWERS;
    case 'TRI':
      return TRI_CORRECT_ANSWERS;
    default:
      throw new Error(`Unknown test type: ${testType}`);
  }
}
