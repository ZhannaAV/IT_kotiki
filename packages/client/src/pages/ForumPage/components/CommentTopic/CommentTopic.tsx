import { Button, Card, Typography } from 'antd'
import styled from 'styled-components'

import { FC } from 'react'

const { Text } = Typography

const CommentCard = styled(Card)`
  & {
    width: 100%;
    min-height: fit-content;

    .ant-card-head {
      min-height: fit-content;
    }

    .ant-card-body {
      display: flex;
      gap: 16px;
      align-items: center;
      justify-content: start;
      padding: 4px 8px;
    }
  }
`

interface IProps {
  author: string,
  content: string,
  time: string,
}

const CommentTopic: FC<IProps> = ({ author, content, time }) => (
  <CommentCard type='inner' title={content} extra={<Button type='text'>Ответить</Button>}>
    <Text>{author}</Text>
    <span>{time.split('T')[0].split('-').reverse().join('.')}</span>
  </CommentCard>
)

export default CommentTopic
