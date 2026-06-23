import { describe, it, expect } from 'vitest';
import { getInitials, isValidDataURI } from '../src/utils/avatar';
import { emptyFormData, contactToFormData } from '../src/models/contact';
import { getContactPath } from '../src/utils/notebook';
import {
  buildListContactsQuery,
  buildSearchContactsQuery,
  buildGetContactQuery,
  buildListGroupsQuery,
} from '../src/utils/sql';

// =============================================================================
// getInitials
// =============================================================================

describe('getInitials', () => {
  describe('中文姓名', () => {
    it('单字中文名应取该字', () => {
      expect(getInitials('张三')).toBe('张三');
    });

    it('三字中文名应取前两字', () => {
      expect(getInitials('欧阳锋')).toBe('欧阳');
    });

    it('四字中文名应取前两字', () => {
      expect(getInitials('司马相如')).toBe('司马');
    });
  });

  describe('英文姓名', () => {
    it('单单词应返回首字母大写', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('两个单词应返回首尾首字母', () => {
      expect(getInitials('John Smith')).toBe('JS');
    });

    it('三个单词应返回首尾首字母', () => {
      expect(getInitials('Jean Claude Van')).toBe('JV');
    });

    it('应大写', () => {
      const result = getInitials('john smith');
      expect(result).toBe('JS');
    });
  });

  describe('边界情况', () => {
    it('空字符串应返回 "?"', () => {
      expect(getInitials('')).toBe('?');
    });

    it('纯空格应返回 "?"', () => {
      expect(getInitials('   ')).toBe('?');
    });

    it('前后空格应被 trim', () => {
      expect(getInitials('  张三  ')).toBe('张三');
    });

    it('自定义 maxChars=1 应只返回一个字符', () => {
      expect(getInitials('张三', 1)).toBe('张');
    });
  });
});

// =============================================================================
// isValidDataURI
// =============================================================================

describe('isValidDataURI', () => {
  it('有效的 image data URI 应返回 true', () => {
    expect(isValidDataURI('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isValidDataURI('data:image/jpeg;base64,/9j/4AAQ=')).toBe(true);
  });

  it('无效格式应返回 false', () => {
    expect(isValidDataURI('')).toBe(false);
    expect(isValidDataURI('not-a-data-uri')).toBe(false);
    expect(isValidDataURI('http://example.com/image.png')).toBe(false);
  });
});

// =============================================================================
// emptyFormData
// =============================================================================

describe('emptyFormData', () => {
  it('应返回所有字段为空字符串的初始表单数据', () => {
    const data = emptyFormData();
    expect(data.name).toBe('');
    expect(data.phone).toBe('');
    expect(data.email).toBe('');
    expect(data.birthday).toBe('');
    expect(data.address).toBe('');
    expect(data.org).toBe('');
    expect(data.notes).toBe('');
    expect(data.groups).toBe('');
    expect(data.avatar).toBe('');
    expect(data.website).toBe('');
    expect(data.wechat).toBe('');
    expect(data.qq).toBe('');
  });
});

// =============================================================================
// contactToFormData
// =============================================================================

describe('contactToFormData', () => {
  it('应正确转换 Contact 为表单数据', () => {
    const contact = {
      id: 'block-123',
      name: '张三',
      phone: '13800138000',
      email: 'zhangsan@example.com',
      birthday: '1990-06-15',
      address: '北京市',
      org: '某公司',
      notes: '备注内容',
      groups: ['朋友', '同事'],
      avatar: '',
      website: 'https://example.com',
      wechat: 'wx_zhangsan',
      qq: '12345678',
      created: '2024-01-01T00:00:00.000Z',
      updated: '2024-06-01T00:00:00.000Z',
      avatarUrl: '',
      initials: '张',
    };

    const formData = contactToFormData(contact);
    expect(formData.name).toBe('张三');
    expect(formData.phone).toBe('13800138000');
    expect(formData.email).toBe('zhangsan@example.com');
    // groups 数组应转换为逗号分隔字符串
    expect(formData.groups).toBe('朋友, 同事');
  });

  it('空分组应显示为空字符串', () => {
    const contact = {
      id: 'block-456',
      name: '李四',
      phone: '',
      email: '',
      birthday: '',
      address: '',
      org: '',
      notes: '',
      groups: [],
      avatar: '',
      website: '',
      wechat: '',
      qq: '',
      created: '',
      updated: '',
      avatarUrl: '',
      initials: '李',
    };
    const formData = contactToFormData(contact);
    expect(formData.groups).toBe('');
  });
});

// =============================================================================
// getContactPath
// =============================================================================

describe('getContactPath', () => {
  it('默认路径应生成 "/姓名" 格式', () => {
    expect(getContactPath('张三')).toBe('/张三');
  });

  it('应拼接父路径', () => {
    expect(getContactPath('王五', '/friends')).toBe('/friends/王五');
  });

  it('父路径末尾含斜杠时应避免双斜杠', () => {
    expect(getContactPath('王五', '/friends/')).toBe('/friends/王五');
  });

  it('文件名中的非法字符应替换为下划线', () => {
    expect(getContactPath('test:file?name')).toBe('/test_file_name');
    expect(getContactPath('a/b\\c')).toBe('/a_b_c');
  });

  it('应 trim 前后空格', () => {
    expect(getContactPath('  张三  ')).toBe('/张三');
  });

  it('连字符名（如幽州-节度使）应保留连字符', () => {
    expect(getContactPath('幽州-节度使')).toBe('/幽州-节度使');
  });

  it('英文连字符名应保留连字符', () => {
    expect(getContactPath('Jean-Claude')).toBe('/Jean-Claude');
  });
});

// =============================================================================
// SQL Query Builders
// =============================================================================

describe('SQL Query Builders', () => {
  const notebookId = '20240101000000-test';

  describe('buildListContactsQuery', () => {
    it('应生成包含 notebook ID 的 SELECT 语句', () => {
      const query = buildListContactsQuery(notebookId);
      expect(query).toContain('SELECT id, hpath, name, ial, created, updated');
      expect(query).toContain(`box = '${notebookId}'`);
      expect(query).toContain("type = 'd'");
      expect(query).toContain("ial LIKE '%custom-contact-name%'");
    });
  });

  describe('buildSearchContactsQuery', () => {
    it('应生成包含关键词过滤的 SELECT 语句', () => {
      const query = buildSearchContactsQuery(notebookId, '张三');
      expect(query).toContain(`box = '${notebookId}'`);
      expect(query).toContain("name LIKE '%张三%'");
    });

    it('英文关键词应正常嵌入', () => {
      const query = buildSearchContactsQuery(notebookId, 'John');
      expect(query).toContain("name LIKE '%John%'");
    });

    it('包含单引号的关键词应被转义', () => {
      const query = buildSearchContactsQuery(notebookId, "D'Angelo");
      expect(query).toContain("name LIKE '%D''Angelo%'");
    });
  });

  describe('buildGetContactQuery', () => {
    it('应生成单块 ID 查询', () => {
      const query = buildGetContactQuery('block-abc');
      expect(query).toContain("id = 'block-abc'");
    });
  });

  describe('buildListGroupsQuery', () => {
    it('应生成带 DISTINCT 的分组查询', () => {
      const query = buildListGroupsQuery(notebookId);
      expect(query).toContain('SELECT DISTINCT ial');
      expect(query).toContain(`box = '${notebookId}'`);
      expect(query).toContain("ial LIKE '%custom-contact-groups%'");
    });
  });
});
