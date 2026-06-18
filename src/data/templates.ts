export interface MessageTemplate {
  id: string;
  name: string;
  template: string;
}

export const messageTemplates: MessageTemplate[] = [
  {
    id: 'tpl_001',
    name: '通用成长型',
    template: '{{name}}同学在暑期托管期间表现出色，学习态度认真，与同学相处融洽。希望在新学期继续保持良好的学习习惯，勇于挑战自我，争取更大进步！',
  },
  {
    id: 'tpl_002',
    name: '鼓励进步型',
    template: '{{name}}同学暑期进步明显，课堂参与度高，作业完成质量好。{{className}}班的你展现了很强的学习潜力，继续加油，未来可期！',
  },
  {
    id: 'tpl_003',
    name: '特长发展型',
    template: '{{name}}同学兴趣广泛，在{{className}}班表现突出，展现了出色的创造力和动手能力。希望你能保持对世界的好奇心，在喜欢的领域深入探索。',
  },
  {
    id: 'tpl_004',
    name: '温和关怀型',
    template: '{{name}}同学是个乖巧懂事的孩子，在暑期托管中与同学们友好相处，学习上也很努力。老师相信只要继续坚持，你一定能取得更优异的成绩！',
  },
  {
    id: 'tpl_005',
    name: '活力阳光型',
    template: '{{name}}同学充满活力，是{{className}}班的开心果！你积极参与各项活动，给大家带来了很多欢乐。新学期也要元气满满地学习和成长哦！',
  },
];

export function getTemplateById(id: string): MessageTemplate | undefined {
  return messageTemplates.find((t) => t.id === id);
}

export function renderTemplate(templateId: string, data: { name: string; className: string }): string {
  const tpl = getTemplateById(templateId);
  if (!tpl) {
    return '';
  }
  let result = tpl.template;
  result = result.replace(/\{\{name\}\}/g, data.name);
  result = result.replace(/\{\{className\}\}/g, data.className);
  return result;
}
