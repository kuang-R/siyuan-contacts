import { describe, it, expect } from 'vitest';
import {
  parseIAL,
  getAttr,
  buildAttrsFromForm,
  buildUpdateAttrsFromForm,
} from '../src/models/attributeKeys';
import { ATTR_KEYS } from '../src/utils/constants';
import type { ContactFormData } from '../src/models/contact';

// =============================================================================
// parseIAL
// =============================================================================

describe('parseIAL', () => {
  it('应正确解析带引号的双属性', () => {
    const result = parseIAL(
      '{: custom-contact-name="张三" custom-contact-phone="13800138000"}'
    );
    expect(result['custom-contact-name']).toBe('张三');
    expect(result['custom-contact-phone']).toBe('13800138000');
  });

  it('应正确解析值包含空格的属性', () => {
    const result = parseIAL(
      '{: custom-contact-address="北京市 朝阳区"}'
    );
    expect(result['custom-contact-address']).toBe('北京市 朝阳区');
  });

  it('应正确解析值包含特殊字符的属性', () => {
    const result = parseIAL(
      '{: custom-contact-notes="hello \\"world\\""}'
    );
    expect(result['custom-contact-notes']).toBe('hello "world"');
  });

  it('应正确解析无引号的属性值', () => {
    const result = parseIAL(
      '{: custom-contact-name=simple}'
    );
    expect(result['custom-contact-name']).toBe('simple');
  });

  it('应正确解析混合引号和无引号的属性', () => {
    const result = parseIAL(
      '{: custom-contact-name="Zhang San" custom-contact-phone=13800138000 custom-contact-birthday="1990-01-01"}'
    );
    expect(result['custom-contact-name']).toBe('Zhang San');
    expect(result['custom-contact-phone']).toBe('13800138000');
    expect(result['custom-contact-birthday']).toBe('1990-01-01');
  });

  it('空字符串应返回空对象', () => {
    expect(parseIAL('')).toEqual({});
  });

  it('无对应属性应返回空对象', () => {
    expect(parseIAL('{: }')).toEqual({});
  });

  it('应正确处理嵌套 IAL（开头的多个 "{:" 前缀）', () => {
    const result = parseIAL(
      '{: {: custom-contact-name="test"}'
    );
    expect(result['custom-contact-name']).toBe('test');
  });

  it('值包含等号的属性应能正确解析', () => {
    const result = parseIAL(
      '{: custom-contact-notes="a=b=c"}'
    );
    expect(result['custom-contact-notes']).toBe('a=b=c');
  });
});

// =============================================================================
// getAttr
// =============================================================================

describe('getAttr', () => {
  it('应从属性记录中提取指定字段的值', () => {
    const attrs = { 'custom-contact-name': '张三' };
    expect(getAttr(attrs, 'name')).toBe('张三');
  });

  it('不存在的字段应返回空字符串', () => {
    const attrs = {};
    expect(getAttr(attrs, 'name')).toBe('');
  });
});

// =============================================================================
// buildAttrsFromForm
// =============================================================================

describe('buildAttrsFromForm', () => {
  const sampleData: ContactFormData = {
    name: '张三',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    birthday: '1990-06-15',
    address: '北京市朝阳区',
    org: '某公司',
    notes: '重要联系人',
    groups: '朋友, 同事',
    avatar: '',
    website: 'https://example.com',
    wechat: 'zhangsan_wx',
    qq: '12345678',
  };

  it('应生成所有核心属性键', () => {
    const attrs = buildAttrsFromForm(sampleData);
    expect(attrs[ATTR_KEYS.name]).toBe('张三');
    expect(attrs[ATTR_KEYS.phone]).toBe('13800138000');
    expect(attrs[ATTR_KEYS.email]).toBe('zhangsan@example.com');
    expect(attrs[ATTR_KEYS.birthday]).toBe('1990-06-15');
    expect(attrs[ATTR_KEYS.address]).toBe('北京市朝阳区');
    expect(attrs[ATTR_KEYS.org]).toBe('某公司');
    expect(attrs[ATTR_KEYS.notes]).toBe('重要联系人');
    expect(attrs[ATTR_KEYS.groups]).toBe('朋友, 同事');
    expect(attrs[ATTR_KEYS.website]).toBe('https://example.com');
    expect(attrs[ATTR_KEYS.wechat]).toBe('zhangsan_wx');
    expect(attrs[ATTR_KEYS.qq]).toBe('12345678');
  });

  it('应包含 created 和 updated 时间戳', () => {
    const attrs = buildAttrsFromForm(sampleData);
    expect(attrs[ATTR_KEYS.created]).toBeTruthy();
    expect(attrs[ATTR_KEYS.updated]).toBeTruthy();
    // 验证是有效的 ISO 日期格式
    expect(new Date(attrs[ATTR_KEYS.created]).toISOString()).toBe(
      attrs[ATTR_KEYS.created]
    );
  });

  it('空字符串字段不应出现在结果中', () => {
    const attrs = buildAttrsFromForm({ ...sampleData, phone: '' });
    expect(attrs[ATTR_KEYS.phone]).toBeUndefined();
  });

  it('created 和 updated 应为当前时间', () => {
    const before = new Date().toISOString();
    const attrs = buildAttrsFromForm(sampleData);
    const after = new Date().toISOString();
    expect(attrs[ATTR_KEYS.created] >= before).toBe(true);
    expect(attrs[ATTR_KEYS.created] <= after).toBe(true);
  });
});

// =============================================================================
// buildUpdateAttrsFromForm
// =============================================================================

describe('buildUpdateAttrsFromForm', () => {
  it('更新属性不应包含 created 字段', () => {
    const data: ContactFormData = {
      name: '李四',
      phone: '13900139000',
      email: '',
      birthday: '',
      address: '',
      org: '',
      notes: '',
      groups: '',
      avatar: '',
      website: '',
      wechat: '',
      qq: '',
    };
    const attrs = buildUpdateAttrsFromForm(data);
    expect(attrs[ATTR_KEYS.name]).toBe('李四');
    expect(attrs[ATTR_KEYS.created]).toBeUndefined();
    expect(attrs[ATTR_KEYS.updated]).toBeTruthy();
  });
});
