import type { StudentRecord } from '../types';
import { messageTemplates } from '../data/templates';

const classNames = [
  '一年级一班', '一年级二班', '一年级三班',
  '二年级一班', '二年级二班', '二年级三班',
  '三年级一班', '三年级二班',
];

const surnames = ['张', '李', '王', '赵', '孙', '周', '吴', '郑', '钱', '陈', '林', '黄', '杨', '刘', '徐'];
const givenNames = ['伟', '芳', '娜', '敏', '静', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '华', '丽', '慧'];

const addresses = [
  '北京市朝阳区建国路88号现代城3号楼',
  '上海市浦东新区陆家嘴环路1000号恒大厦',
  '广州市天河区天河路385号太古汇',
  '深圳市南山区科技园路1号腾讯大厦',
  '杭州市西湖区文三路259号昌地火炬大厦',
  '成都市锦江区春熙路1号银石广场',
  '武汉市洪山区珞喻路1037号华中科技大学',
  '西安市碑林区长安北路1号会展中心',
  '南京市鼓楼区中山路321号南京中心',
  '重庆市渝中区解放碑1号环球金融中心',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(): string {
  return randomPick(surnames) + randomPick(givenNames);
}

export function generateMockStudents(count: number): StudentRecord[] {
  const records: StudentRecord[] = [];
  const templateIds = messageTemplates.map((t) => t.id);

  for (let i = 0; i < count; i++) {
    const id = `S${String(i + 1).padStart(3, '0')}`;
    records.push({
      id,
      name: generateName(),
      className: randomPick(classNames),
      scores: {
        learning: randomInt(60, 100),
        discipline: randomInt(60, 100),
        cooperation: randomInt(60, 100),
        creativity: randomInt(60, 100),
        physical: randomInt(60, 100),
      },
      avatarUrl: `https://picsum.photos/seed/student${id}/200/200`,
      templateId: randomPick(templateIds),
      address: randomPick(addresses),
    });
  }

  return records;
}

export const MOCK_PRESET_COUNTS = [
  { label: '10 条（快速预览）', value: 10 },
  { label: '50 条（小规模测试）', value: 50 },
  { label: '70 条（Worker 阈值）', value: 70 },
  { label: '100 条（中等规模）', value: 100 },
  { label: '300 条（完整场景）', value: 300 },
];
