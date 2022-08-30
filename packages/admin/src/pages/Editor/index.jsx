import Editor from '@/components/Editor';
import PublishDraftModal from '@/components/PublishDraftModal';
import Tags from '@/components/Tags';
import UpdateModal from '@/components/UpdateModal';
import {
  getAbout,
  getArticleById,
  getDraftById,
  updateAbout,
  updateArticle,
  updateDraft,
} from '@/services/van-blog/api';
import { parseMarkdownFile, parseObjToMarkdown } from '@/services/van-blog/parseMarkdownFile';
import { DownOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-layout';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Tag, Upload } from 'antd';
import { debounce } from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import { history } from 'umi';
export default function () {
  const [value, setValue] = useState('');
  const [currObj, setCurrObj] = useState({});
  const [loading, setLoading] = useState(true);
  const type = history.location.query?.type || 'article';
  const typeMap = {
    article: '文章',
    draft: '草稿',
    about: '关于',
  };
  const fetchData = useCallback(async () => {
    setLoading(true);
    const type = history.location.query?.type || 'article';
    const id = history.location.query?.id;
    if (type == 'about') {
      const { data } = await getAbout();
      setValue(data?.content || '');
      setCurrObj(data);
    }
    if (type == 'article' && id) {
      const { data } = await getArticleById(id);
      setValue(data?.content || '');
      setCurrObj(data);
    }
    if (type == 'draft' && id) {
      const { data } = await getDraftById(id);
      setValue(data?.content || '');
      setCurrObj(data);
    }
    setLoading(false);
  }, [history, setLoading, setValue]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    // 进入默认收起侧边栏
    const el = document.querySelector('.ant-pro-sider-collapsed-button');
    if (el && el.style.paddingLeft != '') {
      el.click();
    }
  }, []);
  const handleBlurFn = async () => {
    const type = history.location.query?.type || 'article';
    const id = history.location.query?.id;
    if (type == 'draft') {
      await updateDraft(id, { content: value });
      console.log('失焦保存草稿成功！');
    }
  };
  const handleBlur = debounce(handleBlurFn, 1000);
  const handleSave = async () => {
    // 先检查一下有没有 more .
    let hasMore = true;
    if (['article', 'draft'].includes(history.location.query?.type)) {
      if (!value?.includes('<!-- more -->')) {
        hasMore = false;
      }
    }
    let hasTags =
      ['article', 'draft'].includes(history.location.query?.type) &&
      currObj?.tags &&
      currObj.tags.length > 0;
    if (history.location.query?.type == 'about') {
      hasTags = true;
    }
    Modal.confirm({
      title: `确定保存吗？${hasTags ? '' : '此文章还没设置标签呢'}`,
      content: hasMore ? undefined : (
        <div style={{ marginTop: 8 }}>
          <p>缺少完整的 more 标记！</p>
          <p>这可能会造成阅读全文前的图片语句被截断从而无法正常显示！</p>
          <p>默认将截取指定的字符数量作为阅读全文前的内容。</p>
          <p>
            您可以点击编辑器工具栏最后第一个按钮在合适的地方插入标记。
            <a
              target={'_blank'}
              rel="noreferrer"
              href="https://vanblog.mereith.com/feature/basic/editor.html#%E4%B8%80%E9%94%AE%E6%8F%92%E5%85%A5-more-%E6%A0%87%E8%AE%B0"
            >
              相关文档
            </a>
          </p>
          <img src="/more.png" alt="more" width={200}></img>
        </div>
      ),
      onOk: async () => {
        const v = value;
        setLoading(true);
        if (type == 'article') {
          await updateArticle(currObj?.id, { content: v });
          await fetchData();
          message.success('保存成功！');
        } else if (type == 'draft') {
          await updateDraft(currObj?.id, { content: v });
          await fetchData();
          message.success('保存成功！');
        } else if (type == 'about') {
          await updateAbout({ content: v });
          await fetchData();
          message.success('保存成功！');
        } else {
        }
        setLoading(false);
      },
      okText: '确认保存',
    });
  };
  const handleExport = async () => {
    const md = parseObjToMarkdown(currObj);
    const data = new Blob([md]);
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currObj?.title || '关于'}.md`;
    link.click();
  };
  const handleImport = async (file) => {
    setLoading(true);
    try {
      const { content } = await parseMarkdownFile(file);
      Modal.confirm({
        title: '确认内容',
        content: <Input.TextArea value={content} autoSize={{ maxRows: 10, minRows: 5 }} />,
        onOk: () => {
          setValue(content);
          message.success('导入成功！');
        },
      });
    } catch (err) {
      message.error('导入失败！请检查文件格式！');
    }
    setLoading(false);
  };
  const actionMenu = (
    <Menu
      items={[
        {
          key: 'resetBtn',
          label: '重置',
          onClick: () => {
            setValue(currObj?.content || '');
            message.success('重置为初始值成功！');
          },
        },
        type != 'about'
          ? {
              key: 'updateModalBtn',
              label: (
                <UpdateModal
                  onFinish={fetchData}
                  type={type}
                  currObj={currObj}
                  setLoading={setLoading}
                />
              ),
            }
          : null,
        type == 'draft'
          ? {
              key: 'publishBtn',
              label: (
                <PublishDraftModal
                  title={currObj?.title}
                  key="publishModal1"
                  id={currObj?.id}
                  trigger={<a key={'publishBtn' + currObj?.id}>发布草稿</a>}
                />
              ),
            }
          : null,
        {
          key: 'importBtn',
          label: '导入内容',
          onClick: () => {
            const el = document.querySelector('#importBtn');
            if (el) {
              el.click();
            }
          },
        },
        {
          key: 'exportBtn',
          label: `导出${typeMap[type]}`,
          onClick: handleExport,
        },
        {
          key: 'helpBtn',
          label: '帮助文档',
          onClick: () => {
            window.open('https://vanblog.mereith.com/feature/basic/editor.html', '_blank');
          },
        },
      ]}
    ></Menu>
  );
  return (
    <PageContainer
      className="editor-full"
      header={{
        title: (
          <Space>
            <span title={type == 'about' ? '关于' : currObj?.title}>
              {type == 'about' ? '关于' : currObj?.title}
            </span>
            {type != 'about' && (
              <>
                <Tag color="green">{typeMap[type] || '-'}</Tag>
                <Tag color="blue">{currObj?.category || '-'}</Tag>
                <Tags tags={currObj?.tags} />
              </>
            )}
          </Space>
        ),
        extra: [
          <Button key="extraSaveBtn" type="primary" onClick={handleSave}>
            保存
          </Button>,
          <Dropdown key="moreAction" overlay={actionMenu} trigger={['click']}>
            <Button size="middle">
              操作
              <DownOutlined />
            </Button>
          </Dropdown>,
        ],
        breadcrumb: {},
      }}
      footer={null}
    >
      <Editor
        loading={loading}
        setLoading={setLoading}
        value={value}
        onChange={setValue}
        onBlur={handleBlur}
      />
      <Upload
        showUploadList={false}
        multiple={false}
        accept={'.md'}
        beforeUpload={handleImport}
        style={{ display: 'none' }}
      >
        <a key="importBtn" type="link" style={{ display: 'none' }} id="importBtn">
          导入内容
        </a>
      </Upload>
    </PageContainer>
  );
}
