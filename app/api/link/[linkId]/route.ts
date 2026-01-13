import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: { linkId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { title, keyword, url } = body;

    // 1. 认证检查
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthenticated.' },
        { status: 401 }
      );
    }

    // 2. 参数基础校验
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required.' },
        { status: 400 }
      );
    }

    if (!keyword) {
      return NextResponse.json(
        { success: false, error: 'Keyword is required.' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required.' },
        { status: 400 }
      );
    }

    if (!params.linkId) {
      return NextResponse.json(
        { success: false, error: 'Link ID is required.' },
        { status: 400 }
      );
    }

    // 3. 查找链接
    const linkFound = await prismadb.link.findUnique({
      where: {
        id: params.linkId
      }
    });

    if (!linkFound) {
      return NextResponse.json(
        { success: false, error: 'Link not found.' },
        { status: 404 }
      );
    }

    // 4. 【关键修复】所有权检查 (防止越权修改)
    if (linkFound.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not own this link.' },
        { status: 403 }
      );
    }

    // 5. 检查 Keyword 是否重复 (排除当前链接自己)
    const currentLink = await prismadb.link.findUnique({
      where: {
        keyword,
        NOT: {
          id: linkFound.id
        }
      }
    });

    if (currentLink) {
      return NextResponse.json(
        { success: false, error: 'Please enter different keyword.' },
        { status: 400 }
      );
    }

    // 6. 执行更新
    const link = await prismadb.link.update({
      where: {
        id: params.linkId
      },
      data: {
        title,
        keyword,
        url
      }
    });

    return NextResponse.json({ success: true, link });
  } catch (error: any) {
    console.log('[LINK_PATCH]', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { linkId: string } }
) {
  try {
    const { userId } = auth();

    // 1. 认证检查
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthenticated.' },
        { status: 401 }
      );
    }

    if (!params.linkId) {
      return NextResponse.json(
        { success: false, error: 'Link ID is required.' },
        { status: 400 }
      );
    }

    // 2. 查找链接
    const linkFound = await prismadb.link.findUnique({
      where: {
        id: params.linkId
      }
    });

    if (!linkFound) {
      return NextResponse.json(
        { success: false, error: 'Link not found.' },
        { status: 404 }
      );
    }

    // 3. 【关键修复】所有权检查 (防止越权删除)
    if (linkFound.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not own this link.' },
        { status: 403 }
      );
    }

    // 4. 执行删除
    const link = await prismadb.link.delete({
      where: {
        id: params.linkId
      }
    });

    return NextResponse.json({ success: true, link });
  } catch (error: any) {
    console.log('[LINK_DELETE]', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
