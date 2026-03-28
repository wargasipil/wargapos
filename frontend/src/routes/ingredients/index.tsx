import { Box, Heading, HStack, Tabs } from '@chakra-ui/react'
import { FlaskConical } from 'lucide-react'
import { MaterialTab } from './material'
import { RecipeListTab } from './recipe'

export function IngredientsPage() {
  return (
    <Box p={{ base: 3, md: 6 }}>
      <HStack gap={2} mb={4}>
        <FlaskConical size={22} />
        <Heading size="md">Ingredients</Heading>
      </HStack>
      <Tabs.Root defaultValue="material" variant="line">
        <Tabs.List mb={4}>
          <Tabs.Trigger value="material">Material</Tabs.Trigger>
          <Tabs.Trigger value="recipe">Recipe</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="material"><MaterialTab /></Tabs.Content>
        <Tabs.Content value="recipe"><RecipeListTab /></Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
