'use client';

import * as z from 'zod';
import axios from 'axios';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import isSlug from 'validator/es/lib/isSlug';
import { zodResolver } from '@hookform/resolvers/zod';

import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUrlModal } from '@/hooks/use-url-modal';
import { useToast } from '@/components/ui/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';

const formSchema = z.object({
  url: z.string().toLowerCase().url({ message: 'Please enter a valid URL.' }),
  keyword: z
    .string()
    .toLowerCase()
    .min(2, { message: 'Please enter 2 or more characters.' })
    .regex(/^[a-z0-9_-]+$/, {
      message: 'Only letters, numbers, hyphens (-) and underscores (_) are allowed.'
    })
});

const UrlModal = () => {
  const router = useRouter();
  const urlModal = useUrlModal();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
      keyword: ''
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);

      // --- 修改开始：稳健的标题获取逻辑 ---
      
      // 1. 默认标题就是 URL 本身（兜底策略）
      let title = values.url;

      try {
        // 2. 尝试获取标题，设置 2 秒超时，避免一直转圈
        const urlResponse = await axios.get(
          `https://api.allorigins.win/get?url=${encodeURIComponent(values.url)}`,
          { timeout: 2000 } 
        );
        // 只有当成功获取且匹配到 title 标签时才覆盖
        const matches = urlResponse.data.contents.match(/<title>(.*?)<\/title>/);
        if (matches?.[1]) {
          title = encodeURI(matches[1]);
        }
      } catch (err) {
        // 3. 如果获取标题失败（CORS、超时等），直接忽略，只在控制台打印警告
        console.warn('自动获取标题失败，将使用 URL 作为默认标题:', err);
      }

      // --- 修改结束 ---

      // 4. 发送创建请求
      const response = await axios.post('/api/link', values, {
        headers: {
          'long-url-title': title // 使用我们处理好的 title
        }
      });

      if (response.data.success) {
        form.reset();
        urlModal.onClose();
        router.push('/admin/url?page=1&per_page=10');
        router.refresh();

        toast({
          variant: 'success',
          title: 'Success!',
          description: 'Short URL has been created.'
        });
      }
    } catch (error: any) {
      // --- 这里也加了防护，防止再次崩溃 ---
      console.error(error);
      
      // 安全地检查 error.response 是否存在
      const errorMessage = error.response?.data?.error;

      if (errorMessage === 'Please enter different keyword.') {
        form.setError('keyword', {
          type: 'manual',
          message: errorMessage
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: errorMessage || 'There was a problem with your request.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title='Create Short URL'
      description='Paste your long link to be shortened with custom keyword.'
      isOpen={urlModal.isOpen}
      onClose={urlModal.onClose}
    >
      <div className='py-2 pb-4'>
        <Form {...form}>
          <form className='space-y-4' onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name='url'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paste the Long URL</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder='Example: https://super-long-link.com/long-params'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='keyword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short URL Keyword</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder='Example: short'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='pt-6 space-x-2 flex items-center justify-end w-full'>
              <Button
                type='button'
                disabled={loading}
                variant='outline'
                onClick={urlModal.onClose}
              >
                Cancel
              </Button>
              <Button disabled={loading} type='submit'>
                {loading && (
                  <>
                    <Loader2 className='animate-spin mr-2' size={18} />
                    Saving...
                  </>
                )}
                {!loading && <>Shorten URL</>}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Modal>
  );
};

export default UrlModal;
