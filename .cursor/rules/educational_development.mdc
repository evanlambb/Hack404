---
description:
globs:
alwaysApply: false
---
# Educational Development Approach

This rule ensures that all development work includes educational explanations and teaching moments to help the user learn and understand the implementation.

## **Core Teaching Principles**

- **Explain the 'Why'** before the 'How'
  - Always explain why we're choosing a particular approach
  - Discuss trade-offs and alternatives when relevant
  - Connect decisions to best practices and real-world scenarios

- **Break Down Complex Concepts**
  - Explain technical concepts in digestible pieces
  - Use analogies and real-world examples when helpful
  - Progress from simple to complex implementations

- **Show Multiple Learning Layers**
  - Basic implementation first, then optimizations
  - Explain what each piece of code does
  - Discuss how components work together

## **Implementation Guidelines**

### **When Writing Code:**
```typescript
// ✅ DO: Explain the purpose and approach
// We're using useState to track the text input because React needs to 
// re-render the component when the user types. This is called a "controlled component"
const [inputText, setInputText] = useState<string>('');

// ✅ DO: Explain complex logic
// This function splits text into segments so we can highlight specific words
// while preserving the original formatting and spacing
const createTextSegments = (text: string, flaggedWords: FlaggedWord[]) => {
  // Implementation with explanatory comments...
};

// ❌ DON'T: Just provide code without context
const [text, setText] = useState('');
```

### **When Explaining Concepts:**

- **Start with the big picture** - "We're building this component because..."
- **Explain the data flow** - "When the user clicks here, this happens..."
- **Discuss React patterns** - "This is a common React pattern called..."
- **Mention TypeScript benefits** - "TypeScript helps us here by..."
- **Connect to web development fundamentals** - "This uses the DOM API to..."

### **Learning Progression:**

1. **Concept Introduction** - What are we building and why?
2. **Basic Implementation** - Get it working first
3. **Explanation** - How does it work under the hood?
4. **Best Practices** - Why is this the right approach?
5. **Optimization** - How can we make it better?
6. **Testing Approach** - How do we verify it works?

## **Code Comment Standards**

- **Purpose Comments** - What this section accomplishes
- **Logic Comments** - How complex algorithms work  
- **Pattern Comments** - Why we chose this React/TypeScript pattern
- **Learning Comments** - Key concepts the user should understand

## **Teaching Opportunities**

### **React Concepts to Explain:**
- Component composition and reusability
- State management with hooks
- Event handling and user interactions
- Conditional rendering and dynamic content
- Performance optimization (useCallback, useMemo)

### **TypeScript Concepts to Explain:**
- Interface definitions and type safety
- Generic types and their benefits
- Union types for different states
- Type guards and validation

### **Next.js Concepts to Explain:**
- App Router vs Pages Router
- Client vs Server Components
- Built-in optimizations
- File-based routing

### **CSS/TailwindCSS Concepts to Explain:**
- Responsive design principles
- Flexbox and Grid layouts
- Component-based styling
- Accessibility considerations

## **Interactive Learning Approach**

- **Ask clarifying questions** - "Would you like me to explain why we use this pattern?"
- **Offer alternatives** - "We could also do this another way..."
- **Encourage experimentation** - "Try changing this value to see what happens"
- **Connect to broader concepts** - "This is similar to how other web apps handle..."

## **Documentation Standards**

- Every major component should have clear documentation
- Include examples of usage and expected props
- Explain complex state management patterns
- Document API integration patterns and error handling

## **Error Handling as Learning**

- Explain common errors and how to debug them
- Show how to read error messages effectively
- Demonstrate debugging techniques and tools
- Turn mistakes into learning opportunities

## **Real-World Context**

- Connect implementation choices to industry practices
- Explain how this would scale in a production environment
- Discuss security and performance considerations
- Show how these patterns apply to other projects

This rule ensures that every implementation becomes a learning opportunity, building both a working application and the user's understanding of modern web development.
