import uniq from "lodash/uniq";
import { ReactTemplate } from "../React/React";
import { TemplateFormat, OnConstructor } from "../Template";
import { MetaCSSPropertiesNode } from "../../metaTemplate/metaTemplate";
import { validJavaScriptIdentifer } from "../utils";

export class ReactStyledComponentsTemplate extends ReactTemplate {
  styledConstants: string[];

  constructor(args: OnConstructor) {
    super({ ...args, dirname: "react-styled-components" });

    this.imports += `import styled from 'styled-components';\n`;

    this.styledConstants = [];
  }

  onElement(
    onElement: Parameters<TemplateFormat["onElement"]>[0]
  ): ReturnType<TemplateFormat["onElement"]>[0] {
    let counter = 0;
    let styledName;
    do {
      styledName = `Styled${onElement.nodeName
        .substring(0, 1)
        .toUpperCase()}${onElement.nodeName.substring(1)}${
        counter === 0 ? "" : counter
      }`;
      counter++;
    } while (this.styledConstants.includes(styledName));
    this.styledConstants.push(styledName);

    const pickedProps = this.renderCSSPropertyProps(onElement.cssProperties);
    const styledProps = `${styledName}Props`;
    this.constants += `type ${styledProps} = ${pickedProps};\n`;
    this.constants += `const ${styledName} = styled.${
      onElement.nodeName
    }<${styledProps}>\`\n  ${onElement.cssProperties
      .map((cssProperty) => this.renderCSSProperty(cssProperty, styledProps))
      .join("\n  ")}\n\``;
    const styledAttributes = {
      ...onElement.attributes,
    };
    delete styledAttributes["class"];
    onElement.cssProperties.forEach((cssProperty) => {
      if (cssProperty.type === "MetaCSSPropertiesConstantNode") return;
      styledAttributes[cssProperty.condition.id] = [
        {
          type: "MetaAttributeVariable",
          id: cssProperty.condition.id,
        },
      ];
    });

    super.onElement({
      ...onElement,
      nodeName: styledName,
      attributes: styledAttributes,
    });

    return styledName;
  }

  renderCSSProperty(
    cssPropertiesNode: MetaCSSPropertiesNode,
    styledProps: string
  ): string {
    switch (cssPropertiesNode.type) {
      case "MetaCSSPropertiesConstantNode": {
        return cssPropertiesNode.cssPropertiesString;
      }
      case "MetaCSSPropertiesConditionalNode": {
        const isValidIdentifier = validJavaScriptIdentifer.test(
          cssPropertiesNode.condition.id
        );
        let conditional = "${";

        if (isValidIdentifier) {
          conditional += `({${cssPropertiesNode.condition.id}}: ${styledProps}) => (${cssPropertiesNode.condition.id}`;
        } else {
          conditional += `(props: ${styledProps}) => (props["${cssPropertiesNode.condition.id}"]`;
        }
        conditional += ` === "${cssPropertiesNode.condition.equalsString}") &&`;
        conditional += ` \`${cssPropertiesNode.cssPropertiesString}\`}`;
        return conditional;
      }
    }
  }

  renderCSSPropertyProps(cssProperties: MetaCSSPropertiesNode[]) {
    return `Pick<Props, ${uniq(
      cssProperties
        .map((cssProperty): string => {
          if (cssProperty.type === "MetaCSSPropertiesConditionalNode") {
            return `"${cssProperty.condition.id}"`;
          }
          return "";
        })
        .filter((val: string): boolean => !!val)
    ).join(" | ")}>`;
  }
}